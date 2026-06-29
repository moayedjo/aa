import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'
import type { ProcessingStatus as Status } from '@/lib/study/client'

const LABELS: Record<Status, string> = {
  uploaded: 'بانتظار التحليل',
  processing: 'جاري تحليل الملف',
  ready: 'اكتمل التحليل',
  error: 'تعذر تحليل الملف',
}

const STYLES: Record<Status, string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

interface ProcessingStatusProps {
  status: Status
  error?: string | null
}

export default function ProcessingStatus({ status, error }: ProcessingStatusProps) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={
          'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
          STYLES[status]
        }
      >
        {status === 'processing' && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
        {status === 'ready' && <CheckCircle2 size={13} aria-hidden="true" />}
        {status === 'error' && <AlertCircle size={13} aria-hidden="true" />}
        {status === 'uploaded' && <Clock size={13} aria-hidden="true" />}
        {LABELS[status]}
      </span>
      {status === 'error' && error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
