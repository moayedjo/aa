'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Send, Loader2, AlertCircle, BookMarked, Sparkles, GraduationCap } from 'lucide-react'
import AiUnavailableNotice from '@/components/study/AiUnavailableNotice'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import {
  studyGet, studyPost, errorMessage, isAiUnavailable,
  type ConversationRow, type ConversationMessage,
} from '@/lib/study/client'

const SUGGESTED = [
  'اشرح هذا الفصل بطريقة مبسطة',
  'ما أهم النقاط في هذه المحاضرة؟',
  'قارن بين المفاهيم الرئيسية',
  'أعطني مثالاً عملياً',
  'ما المصطلحات التي يجب حفظها؟',
]

type TeacherLevel = 'beginner' | 'intermediate' | 'advanced'
const LEVELS: { id: TeacherLevel; label: string }[] = [
  { id: 'beginner', label: 'مبتدئ' },
  { id: 'intermediate', label: 'متوسط' },
  { id: 'advanced', label: 'متقدم' },
]

interface ChatResponse {
  conversationId: string
  message: ConversationMessage
}

export default function StudyChatPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const routeId = params.id
  const isNew = routeId === 'new'
  const fileIdParam = search.get('fileId')

  const [conversationId, setConversationId] = useState<string | null>(isNew ? null : routeId)
  const [fileId, setFileId] = useState<string | null>(fileIdParam)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(!isNew)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  const [teacherMode, setTeacherMode] = useState(false)
  const [teacherLevel, setTeacherLevel] = useState<TeacherLevel>('intermediate')
  const [allowGeneral, setAllowGeneral] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isNew) { setLoadingHistory(false); return }
    let cancelled = false
    studyGet<ConversationRow>(`/api/study/conversations/${routeId}`)
      .then((conv) => {
        if (cancelled) return
        setMessages(conv.messages ?? [])
        setFileId(conv.study_file_id)
      })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [routeId, isNew])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    if (!fileId) { setError('لا يوجد ملف مرتبط بهذه المحادثة'); return }
    setError(null)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setSending(true)
    try {
      const res = await studyPost<ChatResponse>('/api/study/chat', {
        conversationId: conversationId ?? undefined,
        studyFileId: fileId,
        message: trimmed,
        mode: teacherMode ? 'teacher' : 'ask',
        teacherLevel: teacherMode ? teacherLevel : undefined,
        allowGeneralKnowledge: allowGeneral,
      })
      setConversationId(res.conversationId)
      setMessages((prev) => [...prev, res.message])
    } catch (err) {
      if (isAiUnavailable(err)) setAiUnavailable(true)
      else setError(errorMessage(err))
      // roll back the optimistic user message marker is unnecessary; keep it visible
    } finally {
      setSending(false)
    }
  }

  if (loadingHistory) {
    return <div className="flex flex-col gap-3"><SkeletonBlock count={4} className="h-16 w-full" /></div>
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-220px)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Sparkles size={18} className="text-primary" aria-hidden="true" /> اسأل الملف
        </h2>
        {fileId && <Link href={`/study/files/${fileId}`} className="text-sm text-primary hover:underline">صفحة الملف</Link>}
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[12px] border border-border bg-white p-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={teacherMode} onChange={(e) => setTeacherMode(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
          <span className="flex items-center gap-1 text-gray-700"><GraduationCap size={15} aria-hidden="true" /> وضع المعلّم</span>
        </label>
        {teacherMode && (
          <div className="flex items-center gap-1" role="group" aria-label="مستوى الشرح">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" onClick={() => setTeacherLevel(l.id)} aria-pressed={teacherLevel === l.id}
                className={'rounded-lg border px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 ' + (teacherLevel === l.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-gray-600')}>
                {l.label}
              </button>
            ))}
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={allowGeneral} onChange={(e) => setAllowGeneral(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
          <span className="text-gray-700">السماح بالمعرفة العامة</span>
        </label>
      </div>

      {aiUnavailable && <AiUnavailableNotice className="mb-3" />}

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto rounded-[12px] border border-border bg-surface p-4">
        {messages.length === 0 && !sending && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-gray-500">اطرح سؤالاً عن محتوى ملفك، أو اختر اقتراحاً:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <MessageBubble key={i} message={m} />)}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-gray-400" role="status">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> جاري التفكير…
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          rows={1}
          placeholder="اكتب سؤالك…"
          aria-label="رسالتك"
          disabled={aiUnavailable}
          className="max-h-32 min-h-[44px] flex-1 resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
        />
        <button type="submit" disabled={sending || !input.trim() || aiUnavailable} aria-label="إرسال"
          className="inline-flex h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user'
  const notFound = message.foundInMaterial === false

  return (
    <div className={isUser ? 'flex justify-start' : 'flex justify-end'}>
      <div className={'max-w-[85%] rounded-[12px] px-4 py-2.5 text-sm leading-relaxed ' + (isUser ? 'bg-primary text-white' : 'border border-border bg-white text-gray-800')}>
        {/* Render as plain text — never inject HTML. */}
        <p className="whitespace-pre-wrap break-words">
          {notFound ? 'لم أجد إجابة لهذا السؤال في محتوى الملف.' : message.content}
        </p>

        {!isUser && message.isGeneralKnowledge && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Sparkles size={11} aria-hidden="true" /> إجابة من المعرفة العامة
          </span>
        )}

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500"><BookMarked size={12} aria-hidden="true" /> المصادر:</p>
            <ul className="flex flex-col gap-0.5 text-xs text-gray-500">
              {message.citations.map((c, i) => (
                <li key={i}>{c.fileName}{c.page != null ? ` — صفحة ${c.page}` : ''}{c.section ? ` (${c.section})` : ''}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
