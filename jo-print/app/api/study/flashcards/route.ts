/**
 * JO Study — flashcard sets. GET: list own. POST: generate.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import {
  getUserPlanLimits, enforceUsageLimits, recordUsage, UsageLimitError,
} from '@/lib/study/usage'
import { withIdempotency, IdempotencyInProgressError } from '@/lib/study/idempotency'
import { generateFlashcardsFor } from '@/lib/study/studyService'
import {
  getAiProvider, AiNotConfiguredError, AiInvalidOutputError,
} from '@/lib/study/aiProvider'
import { generateFlashcardsRequest } from '@/lib/study/schemas'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  const { data, error } = await supabase
    .from('study_flashcard_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('flashcards GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  return studyOk(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('flashcards', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = generateFlashcardsRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const input = parsed.data

  const { data: file, error: fileErr } = await supabase
    .from('study_files')
    .select('id, user_id, title, original_filename, extracted_text, processing_status, deleted_at')
    .eq('id', input.studyFileId)
    .maybeSingle()
  if (fileErr) {
    console.error('flashcards POST file error:', fileErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!file || file.user_id !== user.id || file.deleted_at) return studyError('NOT_FOUND')
  if (file.processing_status !== 'ready' || !file.extracted_text) {
    return studyError('PROCESSING_ERROR', 'يجب تحليل الملف أولاً قبل إنشاء البطاقات')
  }

  try {
    const limits = await getUserPlanLimits(supabase, user.id)
    if (input.count > limits.maxFlashcards) {
      return studyError('USAGE_LIMIT', `الحد الأقصى لعدد البطاقات في باقتك هو ${limits.maxFlashcards}`)
    }
    await enforceUsageLimits(user.id, limits, { feature: 'flashcards' })

    const model = getAiProvider().model
    const fileName = (file.original_filename as string) || (file.title as string)

    const { result, replayed } = await withIdempotency(
      { userId: user.id, key: input.idempotencyKey, feature: 'flashcards' },
      async (): Promise<{ id: string }> => {
        let usage
        try {
          const out = await generateFlashcardsFor(
            { fileName, text: file.extracted_text as string },
            { count: input.count, topic: input.topic },
          )
          usage = out.usage
          await recordUsage({ userId: user.id, feature: 'flashcards', model, usage, status: 'success' })

          const { data: row, error: insErr } = await supabase
            .from('study_flashcard_sets')
            .insert({
              user_id: user.id,
              study_file_id: file.id,
              title: out.data.title,
              cards: out.data.cards,
            })
            .select('id')
            .single()
          if (insErr || !row) throw new Error(`insert failed: ${insErr?.code ?? 'unknown'}`)
          return { id: row.id as string }
        } catch (genErr) {
          if (genErr instanceof AiInvalidOutputError) {
            await recordUsage({ userId: user.id, feature: 'flashcards', model, usage, status: 'invalid_output' })
          } else if (!(genErr instanceof AiNotConfiguredError)) {
            await recordUsage({ userId: user.id, feature: 'flashcards', model, usage, status: 'error' })
          }
          throw genErr
        }
      },
    )

    const { data: row, error: rowErr } = await supabase
      .from('study_flashcard_sets')
      .select('*')
      .eq('id', result.id)
      .eq('user_id', user.id)
      .single()
    if (rowErr || !row) {
      console.error('flashcards POST refetch error:', rowErr?.code)
      return studyError('SERVER_ERROR')
    }
    return studyOk(row, replayed ? 200 : 201)
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return studyError('AI_NOT_CONFIGURED')
    if (err instanceof AiInvalidOutputError) return studyError('AI_INVALID_OUTPUT')
    if (err instanceof UsageLimitError) return studyError('USAGE_LIMIT', err.message)
    if (err instanceof IdempotencyInProgressError) return studyError('RATE_LIMITED', 'الطلب قيد التنفيذ')
    console.error('flashcards POST error:', err instanceof Error ? err.name : 'unknown')
    return studyError('SERVER_ERROR')
  }
}
