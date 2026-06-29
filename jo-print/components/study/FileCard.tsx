'use client'

import Link from 'next/link'
import { FileText, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import ProcessingStatus from './ProcessingStatus'
import type { StudyFileRow } from '@/lib/study/client'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`
}

interface FileCardProps {
  file: StudyFileRow
  onDelete?: (id: string) => void
  deleting?: boolean
}

export default function FileCard({ file, onDelete, deleting }: FileCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/study/files/${file.id}`}
          className="flex min-w-0 items-start gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg"
        >
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-gray-800">{file.title}</span>
            <span className="block truncate text-xs text-gray-500">
              {file.original_filename} · {formatSize(file.file_size)}
              {file.page_count ? ` · ${file.page_count} صفحة` : ''}
            </span>
          </span>
        </Link>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(file.id)}
            disabled={deleting}
            aria-label={`حذف الملف ${file.title}`}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <ProcessingStatus status={file.processing_status} error={file.processing_error} />
        {file.subject && <span className="text-xs text-gray-400">{file.subject}</span>}
      </div>
    </Card>
  )
}
