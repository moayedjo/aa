/**
 * JO Study — quizzes collection. GET: list own. POST: generate.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import {
  getUserPlanLimits, enforceUsageLimits, recordUsage, UsageLimitError,
} from '@/lib/study/usage'
import { withIdempotency, IdempotencyInProgressError } from '@/lib/study/idempotency'
import { generateQuizFor } from '@/lib/study/studyService'
import {
  getAiProvider, AiNotConfiguredError, AiInvalidOutputError,
} from '@/lib/study/aiProvider'
import { generateQuizRequest } from '@/lib/study/schemas'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  const { data, error } = await supabase
    .from('study_quizzes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('quizzes GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  return studyOk(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('quiz', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = generateQuizRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const input = parsed.data

  const { data: file, error: fileErr } = await supabase
    .from('study_files')
    .select('id, user_id, title, original_filename, extracted_text, processing_status, deleted_at')
    .eq('id', input.studyFileId)
    .maybeSingle()
  if (fileErr) {
    console.error('quizzes POST file error:', fileErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!file || file.user_id !== user.id || file.deleted_at) return studyError('NOT_FOUND')
  if (file.processing_status !== 'ready' || !file.extracted_text) {
    return studyError('PROCESSING_ERROR', 'يجب تحليل الملف أولاً قبل إنشاء الاختبار')
  }

  try {
    const limits = await getUserPlanLimits(supabase, user.id)
    if (input.questionCount > limits.maxQuizQuestions) {
      return studyError('USAGE_LIMIT', `الحد الأقصى لعدد الأسئلة في باقتك هو ${limits.maxQuizQuestions}`)
    }
    await enforceUsageLimits(user.id, limits, { feature: 'quiz' })

    const model = getAiProvider().model
    const fileName = (file.original_filename as string) || (file.title as string)

    const { result, replayed } = await withIdempotency(
      { userId: user.id, key: input.idempotencyKey, feature: 'quiz' },
      async (): Promise<{ id: string }> => {
        let usage
        try {
          const out = await generateQuizFor(
            { fileName, text: file.extracted_text as string },
            {
              quizType: input.quizType,
              difficulty: input.difficulty,
              questionCount: input.questionCount,
              selectedPages: input.selectedPages,
            },
          )
          usage = out.usage
          await recordUsage({ userId: user.id, feature: 'quiz', model, usage, status: 'success' })

          const { data: row, error: insErr } = await supabase
            .from('study_quizzes')
            .insert({
              user_id: user.id,
              study_file_id: file.id,
              title: out.data.title,
              quiz_type: input.quizType,
              difficulty: out.data.difficulty ?? input.difficulty,
              question_count: out.data.questions.length,
              settings: input.settings ?? null,
              questions: out.data.questions,
            })
            .select('id')
            .single()
          if (insErr || !row) throw new Error(`insert failed: ${insErr?.code ?? 'unknown'}`)
          return { id: row.id as string }
        } catch (genErr) {
          if (genErr instanceof AiInvalidOutputError) {
            await recordUsage({ userId: user.id, feature: 'quiz', model, usage, status: 'invalid_output' })
          } else if (!(genErr instanceof AiNotConfiguredError)) {
            await recordUsage({ userId: user.id, feature: 'quiz', model, usage, status: 'error' })
          }
          throw genErr
        }
      },
    )

    const { data: row, error: rowErr } = await supabase
      .from('study_quizzes')
      .select('*')
      .eq('id', result.id)
      .eq('user_id', user.id)
      .single()
    if (rowErr || !row) {
      console.error('quizzes POST refetch error:', rowErr?.code)
      return studyError('SERVER_ERROR')
    }
    return studyOk(row, replayed ? 200 : 201)
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return studyError('AI_NOT_CONFIGURED')
    if (err instanceof AiInvalidOutputError) return studyError('AI_INVALID_OUTPUT')
    if (err instanceof UsageLimitError) return studyError('USAGE_LIMIT', err.message)
    if (err instanceof IdempotencyInProgressError) return studyError('RATE_LIMITED', 'الطلب قيد التنفيذ')
    console.error('quizzes POST error:', err instanceof Error ? err.name : 'unknown')
    return studyError('SERVER_ERROR')
  }
}
