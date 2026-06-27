/**
 * JO Study — single quiz (owner-only).
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { isValidUUID } from '@/lib/apiHelpers'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!isValidUUID(params.id)) return studyError('VALIDATION')
  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  const { data, error } = await supabase
    .from('study_quizzes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (error) {
    console.error('quiz GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  if (!data || data.user_id !== user.id) return studyError('NOT_FOUND')
  return studyOk(data)
}
