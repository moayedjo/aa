'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import PrintWithJoPrint from '@/components/study/PrintWithJoPrint'
import { studyGet, errorMessage, type SummaryRow } from '@/lib/study/client'
import { summarySchema, type StudySummary } from '@/lib/study/schemas'

export default function SummaryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [summary, setSummary] = useState<StudySummary | null>(null)
  const [meta, setMeta] = useState<SummaryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    studyGet<SummaryRow>(`/api/study/summaries/${id}`)
      .then((row) => {
        if (cancelled) return
        setMeta(row)
        const parsed = summarySchema.safeParse(row.structured_content)
        if (parsed.success) setSummary(parsed.data)
        else setError('تعذر عرض محتوى الملخص')
      })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div className="flex flex-col gap-4"><SkeletonBlock className="h-24 w-full" /><SkeletonBlock count={3} className="h-20 w-full" /></div>

  if (error || !summary) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <span className="flex items-center gap-2"><AlertCircle size={18} aria-hidden="true" /> {error ?? 'الملخص غير موجود'}</span>
        <Link href="/study/summaries" className="font-medium text-primary hover:underline">العودة إلى الملخصات</Link>
      </div>
    )
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/study/summaries" className="text-sm text-primary hover:underline">‹ الملخصات</Link>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{summary.title}</h2>
        {meta && <PrintWithJoPrint sourceType="summary" sourceId={meta.id} className="shrink-0" />}
      </header>

      {summary.overview && (
        <Card className="p-5"><p className="whitespace-pre-wrap leading-relaxed text-gray-700">{summary.overview}</p></Card>
      )}

      <Section title="الأفكار الرئيسية" show={summary.mainIdeas.length > 0}>
        <ul className="flex flex-col gap-3">
          {summary.mainIdeas.map((m, i) => (
            <li key={i}>
              <p className="font-semibold text-gray-800">{m.title}</p>
              <p className="text-sm leading-relaxed text-gray-600">{m.explanation}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="التعريفات" show={summary.definitions.length > 0}>
        <dl className="flex flex-col gap-2">
          {summary.definitions.map((d, i) => (
            <div key={i}><dt className="inline font-semibold text-gray-800">{d.term}: </dt><dd className="inline text-sm text-gray-600">{d.definition}</dd></div>
          ))}
        </dl>
      </Section>

      <Section title="حقائق مهمة" show={summary.keyFacts.length > 0}><BulletList items={summary.keyFacts} /></Section>
      <Section title="نقاط للمراجعة" show={summary.reviewPoints.length > 0}><BulletList items={summary.reviewPoints} /></Section>
      <Section title="أسئلة للتدريب" show={summary.practiceQuestions.length > 0}><BulletList items={summary.practiceQuestions} /></Section>
      <Section title="تنبيهات" show={summary.warnings.length > 0}><BulletList items={summary.warnings} /></Section>
    </article>
  )
}

function Section({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return (
    <Card className="p-5">
      <h3 className="mb-3 border-r-2 border-primary pr-2 text-base font-bold text-gray-900">{title}</h3>
      {children}
    </Card>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-inside list-disc flex-col gap-1.5 text-sm leading-relaxed text-gray-600">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}
