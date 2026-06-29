'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/study/EmptyState'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import AiUnavailableNotice from '@/components/study/AiUnavailableNotice'
import PrintWithJoPrint from '@/components/study/PrintWithJoPrint'
import { studyGet, errorMessage, isAiUnavailable, type SummaryRow } from '@/lib/study/client'

const TYPE_LABEL: Record<SummaryRow['summary_type'], string> = {
  quick: 'سريع',
  standard: 'قياسي',
  detailed: 'مفصّل',
  exam_night: 'ليلة الامتحان',
}

export default function StudySummariesPage() {
  const [summaries, setSummaries] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    studyGet<SummaryRow[]>('/api/study/summaries')
      .then((d) => { if (!cancelled) setSummaries(d) })
      .catch((err) => {
        if (cancelled) return
        if (isAiUnavailable(err)) setAiUnavailable(true)
        else setError(errorMessage(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">الملخصات</h2>
      {aiUnavailable && <AiUnavailableNotice />}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <SkeletonBlock count={4} className="h-24 w-full" />
      ) : summaries.length === 0 ? (
        <EmptyState icon={<BookOpen size={32} aria-hidden="true" />} title="لا توجد ملخصات بعد" description="لخّص أحد ملفاتك لتظهر هنا." actionLabel="اذهب إلى ملفاتي" actionHref="/study/files" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {summaries.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/study/summaries/${s.id}`} className="truncate font-bold text-gray-800 hover:text-primary">{s.title}</Link>
                  <Badge variant="info">{TYPE_LABEL[s.summary_type]}</Badge>
                </div>
                <p className="mt-1 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ar')}</p>
              </div>
              <PrintWithJoPrint sourceType="summary" sourceId={s.id} size="sm" className="shrink-0" />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
