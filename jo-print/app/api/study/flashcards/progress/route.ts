/**
 * JO Study — record per-card review progress (upsert).
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { flashcardProgressRequest } from '@/lib/study/schemas'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = flashcardProgressRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const input = parsed.data

  // Verify the flashcard set belongs to the user.
  const { data: set, error: setErr } = await supabase
    .from('study_flashcard_sets')
    .select('id, user_id')
    .eq('id', input.flashcardSetId)
    .maybeSingle()
  if (setErr) {
    console.error('flashcard progress set error:', setErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!set || set.user_id !== user.id) return studyError('NOT_FOUND')

  const now = new Date().toISOString()

  // Read existing row to increment review_count (unique on user+set+card).
  const { data: existing, error: existErr } = await supabase
    .from('study_flashcard_progress')
    .select('id, review_count')
    .eq('user_id', user.id)
    .eq('flashcard_set_id', input.flashcardSetId)
    .eq('card_id', input.cardId)
    .maybeSingle()
  if (existErr) {
    console.error('flashcard progress read error:', existErr.code)
    return studyError('SERVER_ERROR')
  }

  const reviewCount = ((existing?.review_count as number | undefined) ?? 0) + 1

  const { error: upsertErr } = await supabase
    .from('study_flashcard_progress')
    .upsert(
      {
        user_id: user.id,
        flashcard_set_id: input.flashcardSetId,
        card_id: input.cardId,
        status: input.status,
        review_count: reviewCount,
        last_reviewed_at: now,
      },
      { onConflict: 'user_id,flashcard_set_id,card_id' },
    )
  if (upsertErr) {
    console.error('flashcard progress upsert error:', upsertErr.code)
    return studyError('SERVER_ERROR')
  }

  return studyOk({ ok: true, reviewCount, status: input.status })
}
