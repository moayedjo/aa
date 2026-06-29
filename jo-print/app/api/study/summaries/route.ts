/**
 * JO Study — summaries collection. GET: list own. POST: generate.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import {
  getUserPlanLimits, enforceUsageLimits, recordUsage, UsageLimitError,
} from '@/lib/study/usage'
import { withIdempotency, IdempotencyInProgressError } from '@/lib/study/idempotency'
import { generateSummaryFor } from '@/lib/study/studyService'
import {
  getAiProvider, AiNotConfiguredError, AiInvalidOutputError,
} from '@/lib/study/aiProvider'
import { generateSummaryRequest } from '@/lib/study/schemas'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  const { data, error } = await supabase
    .from('study_summaries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('summaries GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  return studyOk(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('summary', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = generateSummaryRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const input = parsed.data

  // Ownership + ready check.
  const { data: file, error: fileErr } = await supabase
    .from('study_files')
    .select('id, user_id, title, original_filename, extracted_text, processing_status, deleted_at')
    .eq('id', input.studyFileId)
    .maybeSingle()
  if (fileErr) {
    console.error('summaries POST file error:', fileErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!file || file.user_id !== user.id || file.deleted_at) return studyError('NOT_FOUND')
  if (file.processing_status !== 'ready' || !file.extracted_text) {
    return studyError('PROCESSING_ERROR', 'يجب تحليل الملف أولاً قبل التلخيص')
  }

  try {
    const limits = await getUserPlanLimits(supabase, user.id)
    if ((input.summaryType === 'detailed' || input.summaryType === 'exam_night') && !limits.allowDetailedSummary) {
      return studyError('USAGE_LIMIT', 'الملخصات المفصّلة متاحة في الباقات المدفوعة')
    }
    await enforceUsageLimits(user.id, limits, { feature: 'summary', maxSummariesPerDay: true })

    const model = getAiProvider().model
    const fileName = (file.original_filename as string) || (file.title as string)

    const { result, replayed } = await withIdempotency(
      { userId: user.id, key: input.idempotencyKey, feature: 'summary' },
      async (): Promise<{ id: string }> => {
        let usage
        try {
          const out = await generateSummaryFor(
            { fileName, text: file.extracted_text as string },
            {
              summaryType: input.summaryType,
              language: input.language,
              topic: input.topic,
              selectedPages: input.selectedPages,
            },
          )
          usage = out.usage
          await recordUsage({ userId: user.id, feature: 'summary', model, usage, status: 'success' })

          const { data: row, error: insErr } = await supabase
            .from('study_summaries')
            .insert({
              user_id: user.id,
              study_file_id: file.id,
              title: out.data.title,
              summary_type: input.summaryType,
              selected_pages: input.selectedPages ?? null,
              selected_sections: input.selectedSections ?? null,
              structured_content: out.data,
              content: out.data.overview ?? null,
              language: input.language,
            })
            .select('id')
            .single()
          if (insErr || !row) throw new Error(`insert failed: ${insErr?.code ?? 'unknown'}`)
          return { id: row.id as string }
        } catch (genErr) {
          if (genErr instanceof AiInvalidOutputError) {
            await recordUsage({ userId: user.id, feature: 'summary', model, usage, status: 'invalid_output' })
          } else if (!(genErr instanceof AiNotConfiguredError)) {
            await recordUsage({ userId: user.id, feature: 'summary', model, usage, status: 'error' })
          }
          throw genErr
        }
      },
    )

    // Re-fetch the row so replayed requests return the same record.
    const { data: row, error: rowErr } = await supabase
      .from('study_summaries')
      .select('*')
      .eq('id', result.id)
      .eq('user_id', user.id)
      .single()
    if (rowErr || !row) {
      console.error('summaries POST refetch error:', rowErr?.code)
      return studyError('SERVER_ERROR')
    }
    return studyOk(row, replayed ? 200 : 201)
  } catch (err) {
    return handleGenerationError(err)
  }
}

function handleGenerationError(err: unknown) {
  if (err instanceof AiNotConfiguredError) return studyError('AI_NOT_CONFIGURED')
  if (err instanceof AiInvalidOutputError) return studyError('AI_INVALID_OUTPUT')
  if (err instanceof UsageLimitError) return studyError('USAGE_LIMIT', err.message)
  if (err instanceof IdempotencyInProgressError) return studyError('RATE_LIMITED', 'الطلب قيد التنفيذ')
  console.error('summaries POST error:', err instanceof Error ? err.name : 'unknown')
  return studyError('SERVER_ERROR')
}
