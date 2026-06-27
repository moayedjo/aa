'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { errorMessage, type StudyFileRow } from '@/lib/study/client'

const ACCEPT = '.pdf,.docx,.pptx,.txt'
const MAX_HINT_MB = 40

type Phase = 'idle' | 'uploading' | 'analyzing' | 'preparing' | 'done' | 'error'

const PHASE_LABEL: Record<Exclude<Phase, 'idle'>, string> = {
  uploading: 'جاري رفع الملف',
  analyzing: 'جاري تحليل الملف',
  preparing: 'جاري تجهيز المحتوى',
  done: 'اكتمل التحليل',
  error: 'تعذر تحليل الملف',
}

interface ApiEnvelope<T> { data?: T; error?: { code?: string; message?: string } }

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`
}

export default function StudyUploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [courseName, setCourseName] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedId, setUploadedId] = useState<string | null>(null)

  const busy = phase === 'uploading' || phase === 'analyzing' || phase === 'preparing'

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError(null)
    setPhase('idle')
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  // Upload via XHR for real progress events.
  function uploadFile(form: FormData): Promise<StudyFileRow> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/study/files')
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100))
      }
      xhr.onload = () => {
        let body: ApiEnvelope<StudyFileRow> | null = null
        try { body = JSON.parse(xhr.responseText) as ApiEnvelope<StudyFileRow> } catch { body = null }
        if (xhr.status >= 200 && xhr.status < 300 && body?.data) resolve(body.data)
        else reject(new Error(body?.error?.message ?? 'فشل رفع الملف'))
      }
      xhr.onerror = () => reject(new Error('تعذر الاتصال بالخادم'))
      xhr.send(form)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setProgress(0)
    setPhase('uploading')
    try {
      const form = new FormData()
      form.append('file', file)
      if (title.trim()) form.append('title', title.trim())
      if (subject.trim()) form.append('subject', subject.trim())
      if (courseName.trim()) form.append('courseName', courseName.trim())

      const row = await uploadFile(form)
      setUploadedId(row.id)

      setPhase('analyzing')
      const res = await fetch(`/api/study/files/${row.id}/process`, { method: 'POST' })
      let body: ApiEnvelope<unknown> | null = null
      try { body = (await res.json()) as ApiEnvelope<unknown> } catch { body = null }
      if (!res.ok || body?.error) {
        // File is uploaded; processing failed. Still let user open the file page.
        throw new Error(body?.error?.message ?? 'تعذر تحليل الملف')
      }
      setPhase('preparing')
      setPhase('done')
      setTimeout(() => router.push(`/study/files/${row.id}`), 700)
    } catch (err) {
      setError(errorMessage(err))
      setPhase('error')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/study/files" className="text-sm text-primary hover:underline">‹ ملفاتي</Link>
        <h2 className="mt-2 text-xl font-bold text-gray-900">رفع مادة دراسية</h2>
        <p className="mt-1 text-sm text-gray-500">الأنواع المدعومة: PDF, DOCX, PPTX, TXT</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="flex flex-col gap-5 p-6">
          {/* File picker */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-border bg-surface px-4 py-10 text-center transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              aria-label="اختيار ملف للرفع"
            >
              {file ? (
                <>
                  <FileText size={28} className="text-primary" aria-hidden="true" />
                  <span className="font-medium text-gray-800">{file.name}</span>
                  <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                </>
              ) : (
                <>
                  <Upload size={28} className="text-gray-400" aria-hidden="true" />
                  <span className="font-medium text-gray-700">اضغط لاختيار ملف</span>
                  <span className="text-xs text-gray-400">الحد الأقصى للحجم يعتمد على باقتك (حتى {MAX_HINT_MB} م.ب)</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={onPick}
              className="sr-only"
              aria-hidden="true"
            />
          </div>

          <Input label="عنوان الملف (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: محاضرة الفصل الأول" disabled={busy} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="المادة (اختياري)" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: أحياء" disabled={busy} />
            <Input label="اسم المساق (اختياري)" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="مثال: BIO101" disabled={busy} />
          </div>

          {/* Progress / phases */}
          {phase !== 'idle' && (
            <div role="status" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {phase === 'done' ? (
                  <CheckCircle2 size={18} className="text-green-600" aria-hidden="true" />
                ) : phase === 'error' ? (
                  <AlertCircle size={18} className="text-red-500" aria-hidden="true" />
                ) : (
                  <Loader2 size={18} className="animate-spin text-primary" aria-hidden="true" />
                )}
                <span className={phase === 'error' ? 'text-red-600' : phase === 'done' ? 'text-green-700' : 'text-gray-700'}>
                  {PHASE_LABEL[phase]}
                </span>
              </div>
              {phase === 'uploading' && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {phase === 'error' && uploadedId && (
                <Link href={`/study/files/${uploadedId}`} className="text-sm font-medium text-primary hover:underline">
                  فتح صفحة الملف
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            رفع وتحليل
          </button>
        </Card>
      </form>
    </div>
  )
}
