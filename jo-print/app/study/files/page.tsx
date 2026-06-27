'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import FileCard from '@/components/study/FileCard'
import EmptyState from '@/components/study/EmptyState'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import { studyGet, studyDelete, errorMessage, type StudyFileRow } from '@/lib/study/client'

export default function StudyFilesPage() {
  const [files, setFiles] = useState<StudyFileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    studyGet<StudyFileRow[]>('/api/study/files')
      .then((data) => { if (!cancelled) setFiles(data) })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete(id: string) {
    const target = files.find((f) => f.id === id)
    if (!confirm(`هل تريد حذف الملف "${target?.title ?? ''}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return
    setDeletingId(id)
    setError(null)
    try {
      await studyDelete(`/api/study/files/${id}`)
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">ملفاتي</h2>
        <Link
          href="/study/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Upload size={16} aria-hidden="true" /> رفع ملف
        </Link>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><SkeletonBlock count={6} className="h-28 w-full" /></div>
      ) : files.length === 0 ? (
        <EmptyState icon={<FileText size={32} aria-hidden="true" />} title="لا توجد ملفات بعد" description="ارفع أول مادة دراسية لتبدأ التلخيص والمذاكرة." actionLabel="رفع ملف" actionHref="/study/upload" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => (
            <FileCard key={f.id} file={f} onDelete={handleDelete} deleting={deletingId === f.id} />
          ))}
        </div>
      )}
    </div>
  )
}
