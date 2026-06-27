/**
 * JO Study — grounded chat over a study file. Conversational (no idempotency key).
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import {
  getUserPlanLimits, enforceUsageLimits, recordUsage, UsageLimitError,
} from '@/lib/study/usage'
import { answerFromMaterial } from '@/lib/study/studyService'
import {
  getAiProvider, AiNotConfiguredError, AiInvalidOutputError,
} from '@/lib/study/aiProvider'
import { chatRequest } from '@/lib/study/schemas'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('chat', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = chatRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const input = parsed.data

  // Ownership + ready check on the file.
  const { data: file, error: fileErr } = await supabase
    .from('study_files')
    .select('id, user_id, title, original_filename, extracted_text, processing_status, deleted_at')
    .eq('id', input.studyFileId)
    .maybeSingle()
  if (fileErr) {
    console.error('chat file error:', fileErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!file || file.user_id !== user.id || file.deleted_at) return studyError('NOT_FOUND')
  if (file.processing_status !== 'ready' || !file.extracted_text) {
    return studyError('PROCESSING_ERROR', 'يجب تحليل الملف أولاً قبل المحادثة')
  }

  try {
    const limits = await getUserPlanLimits(supabase, user.id)
    await enforceUsageLimits(user.id, limits, { feature: 'chat' })

    // Resolve the provider early so a misconfiguration short-circuits before writes.
    const model = getAiProvider().model

    // Resolve / create the conversation (owner-scoped).
    let conversationId: string
    if (input.conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from('study_conversations')
        .select('id, user_id')
        .eq('id', input.conversationId)
        .maybeSingle()
      if (convErr) {
        console.error('chat conv fetch error:', convErr.code)
        return studyError('SERVER_ERROR')
      }
      if (!conv || conv.user_id !== user.id) return studyError('NOT_FOUND')
      conversationId = conv.id as string
    } else {
      const { data: conv, error: createErr } = await supabase
        .from('study_conversations')
        .insert({
          user_id: user.id,
          study_file_id: file.id,
          mode: input.mode === 'teacher' ? 'teacher' : 'ask',
          title: input.message.slice(0, 80),
        })
        .select('id')
        .single()
      if (createErr || !conv) {
        console.error('chat conv create error:', createErr?.code)
        return studyError('SERVER_ERROR')
      }
      conversationId = conv.id as string
    }

    // Load recent history (last ~6 messages).
    const { data: historyRows } = await supabase
      .from('study_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(6)
    const history = (historyRows ?? [])
      .reverse()
      .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
        m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content as string }))

    // Persist the user's message.
    await supabase.from('study_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: input.message,
    })

    let usage
    try {
      const out = await answerFromMaterial(
        { fileName: (file.original_filename as string) || (file.title as string), text: file.extracted_text as string },
        {
          question: input.message,
          mode: input.mode,
          teacherLevel: input.teacherLevel,
          allowGeneralKnowledge: input.allowGeneralKnowledge,
          history,
        },
      )
      usage = out.usage
      await recordUsage({ userId: user.id, feature: 'chat', model, usage, status: 'success' })

      await supabase.from('study_messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: out.data.answer,
        citations: out.data.citations,
        token_usage: { input: usage.inputTokens, output: usage.outputTokens },
      })

      return studyOk({ conversationId, answer: out.data })
    } catch (genErr) {
      if (genErr instanceof AiInvalidOutputError) {
        await recordUsage({ userId: user.id, feature: 'chat', model, usage, status: 'invalid_output' })
      } else if (!(genErr instanceof AiNotConfiguredError)) {
        await recordUsage({ userId: user.id, feature: 'chat', model, usage, status: 'error' })
      }
      throw genErr
    }
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return studyError('AI_NOT_CONFIGURED')
    if (err instanceof AiInvalidOutputError) return studyError('AI_INVALID_OUTPUT')
    if (err instanceof UsageLimitError) return studyError('USAGE_LIMIT', err.message)
    console.error('chat POST error:', err instanceof Error ? err.name : 'unknown')
    return studyError('SERVER_ERROR')
  }
}
