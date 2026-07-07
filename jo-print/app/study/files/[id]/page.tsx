'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, FileSearch, MessageCircleQuestion, ListChecks, Layers,
  AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import ProcessingStatus from '@/components/study/ProcessingStatus'
import AiUnavailableNotice from '@/components/study/AiUnavailableNotice'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import {
  studyGet, studyPost, errorMessage, isAiUnavailable,
  type StudyFileRow,
} from '@/lib/study/client'

type SummaryType = 'quick' | 'standard' | 'detailed' | 'exam_night'
const SUMMARY_TYPES: { id: SummaryType; label: string }[] = [
  { id: 'quick', label: 'سريع' },
  { id: 'standard', label: 'قياسي' },
  { id: 'detailed', label: 'مفصّل' },
  { id: 'exam_night', label: 'ليلة الامتحان' },
]

interface CreatedRow { id: string }

export default function StudyFileDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const fileId = params.id
  const [file, setFile] = useState<StudyFileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  const [showSummaryOptions, setShowSummaryOptions] = useState(false)
  const [summaryType, setSummaryType] = useState<SummaryType>('standard')
  const [topic, setTopic] = useState('')
  const [pages, setPages] = useState('')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadFile = useCallback(() => {
    setLoading(true)
    setError(null)
    studyGet<StudyFileRow>(`/api/study/files/${fileId}`)
      .then(setFile)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [fileId])

  useEffect(() => { loadFile() }, [loadFile])

  const ready = file?.processing_status === 'ready'

  async function reprocess() {
    setActionBusy('process')
    setActionError(null)
    try {
      await studyPost(`/api/study/files/${fileId}/process`)
      loadFile()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function runAction(key: string, fn: () => Promise<void>) {
    setActionBusy(key)
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      if (isAiUnavailable(err)) setAiUnavailable(true)
      else setActionError(errorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  function generateSummary() {
    return runAction('summary', async () => {
      const row = await studyPost<CreatedRow>('/api/study/summaries', {
        studyFileId: fileId,
        summaryType,
        topic: topic.trim() || undefined,
        selectedPages: pages.trim() || undefined,
      })
      router.push(`/study/summaries/${row.id}`)
    })
  }

  function startChat() {
    // Create a conversation via the first chat message, then navigate.
    router.push(`/study/chat/new?fileId=${fileId}`)
  }
  // Note: chat page accepts ?fileId and treats [id]='new' as a fresh conversation.

  function generateQuiz() {
    return runAction('quiz', async () => {
      const row = await studyPost<CreatedRow>('/api/study/quizzes', {
        studyFileId: fileId,
        quizType: 'mixed',
        difficulty: 'medium',
        questionCount: 10,
      })
      router.push(`/study/quizzes/${row.id}`)
    })
  }

  function generateFlashcards() {
    return runAction('flashcards', async () => {
      await studyPost<CreatedRow>('/api/study/flashcards', { studyFileId: fileId, count: 20 })
      router.push('/study/flashcards')
    })
  }

  if (loading) {
    return <div className="flex flex-col gap-4"><SkeletonBlock className="h-32 w-full" /><SkeletonBlock count={2} className="h-24 w-full" /></div>
  }

  if (error || !file) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <span className="flex items-center gap-2"><AlertCircle size={18} aria-hidden="true" /> {error ?? 'العنصر غير موجود'}</span>
        <Link href="/study/files" className="font-medium text-primary hover:underline">العودة إلى ملفاتي</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/study/files" className="text-sm text-primary hover:underline">‹ ملفاتي</Link>

      {/* Metadata */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText size={24} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{file.title}</h2>
            <p className="truncate text-sm text-gray-500">{file.original_filename}</p>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
              {file.subject && <div><dt className="inline font-medium">المادة: </dt><dd className="inline">{file.subject}</dd></div>}
              {file.course_name && <div><dt className="inline font-medium">المساق: </dt><dd className="inline">{file.course_name}</dd></div>}
              {file.page_count != null && <div><dt className="inline font-medium">الصفحات: </dt><dd className="inline">{file.page_count}</dd></div>}
              {file.language && <div><dt className="inline font-medium">اللغة: </dt><dd className="inline">{file.language === 'ar' ? 'العربية' : file.language === 'en' ? 'الإنجليزية' : file.language}</dd></div>}
            </dl>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <ProcessingStatus status={file.processing_status} error={file.processing_error} />
          {(file.processing_status === 'error' || file.processing_status === 'uploaded') && (
            <button
              type="button"
              onClick={reprocess}
              disabled={actionBusy === 'process'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-gray-600 hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            >
              {actionBusy === 'process' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
              إعادة التحليل
            </button>
          )}
        </div>
      </Card>

      {aiUnavailable && <AiUnavailableNotice />}

      {actionError && (
        <div role="alert" className="flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} aria-hidden="true" /> {actionError}
        </div>
      )}

      {!ready && (
        <p className="rounded-[12px] border border-border bg-surface p-4 text-sm text-gray-500">
          يجب اكتمال تحليل الملف قبل استخدام ميزات الذكاء الاصطناعي.
        </p>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Summarize */}
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSearch size={20} aria-hidden="true" /></span>
            <div><p className="font-bold text-gray-800">لخّص المادة</p><p className="text-sm text-gray-500">ملخص منظّم بمصادره.</p></div>
          </div>
          {!showSummaryOptions ? (
            <button type="button" onClick={() => setShowSummaryOptions(true)} disabled={!ready} className="mt-auto inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">خيارات التلخيص</button>
          ) : (
            <div className="flex flex-col gap-3">
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-gray-700">نوع الملخص</legend>
                <div className="flex flex-wrap gap-2">
                  {SUMMARY_TYPES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setSummaryType(t.id)} aria-pressed={summaryType === t.id}
                      className={'rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ' + (summaryType === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-gray-600 hover:border-primary')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Input label="موضوع محدد (اختياري)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: الجهاز التنفسي" />
              <Input label="صفحات محددة (اختياري)" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="مثال: 1-10" hint="اتركه فارغاً لتلخيص كامل الملف" />
              <button type="button" onClick={generateSummary} disabled={!ready || actionBusy === 'summary'} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
                {actionBusy === 'summary' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} إنشاء الملخص
              </button>
            </div>
          )}
        </Card>

        {/* Ask */}
        <ActionTile icon={<MessageCircleQuestion size={20} aria-hidden="true" />} title="اسأل الملف" desc="محادثة مبنية على محتوى ملفك." actionLabel="بدء المحادثة" onClick={startChat} disabled={!ready} busy={false} />

        {/* Quiz */}
        <ActionTile icon={<ListChecks size={20} aria-hidden="true" />} title="أنشئ اختباراً" desc="أسئلة متنوعة مع التصحيح والشرح." actionLabel="إنشاء اختبار" onClick={() => generateQuiz()} disabled={!ready} busy={actionBusy === 'quiz'} />

        {/* Flashcards */}
        <ActionTile icon={<Layers size={20} aria-hidden="true" />} title="أنشئ بطاقات حفظ" desc="بطاقات للمراجعة السريعة." actionLabel="إنشاء بطاقات" onClick={() => generateFlashcards()} disabled={!ready} busy={actionBusy === 'flashcards'} />
      </div>
    </div>
  )
}

function ActionTile({ icon, title, desc, actionLabel, onClick, disabled, busy }: {
  icon: React.ReactNode; title: string; desc: string; actionLabel: string; onClick: () => void; disabled: boolean; busy: boolean
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div><p className="font-bold text-gray-800">{title}</p><p className="text-sm text-gray-500">{desc}</p></div>
      </div>
      <button type="button" onClick={onClick} disabled={disabled || busy} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {actionLabel}
      </button>
    </Card>
  )
}
