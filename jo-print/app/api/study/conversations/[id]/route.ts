/**
 * JO Study — single conversation with its messages (owner-only).
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

  const { data: conversation, error } = await supabase
    .from('study_conversations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (error) {
    console.error('conversation GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  if (!conversation || conversation.user_id !== user.id) return studyError('NOT_FOUND')

  const { data: messages, error: msgErr } = await supabase
    .from('study_messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
  if (msgErr) {
    console.error('conversation messages error:', msgErr.code)
    return studyError('SERVER_ERROR')
  }

  return studyOk({ conversation, messages: messages ?? [] })
}
