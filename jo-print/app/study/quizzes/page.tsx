'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ListChecks, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/study/EmptyState'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import AiUnavailableNotice from '@/components/study/AiUnavailableNotice'
import { studyGet, errorMessage, isAiUnavailable, type QuizRow } from '@/lib/study/client'

const DIFF_LABEL: Record<QuizRow['difficulty'], string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

export default function StudyQuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    studyGet<QuizRow[]>('/api/study/quizzes')
      .then((d) => { if (!cancelled) setQuizzes(d) })
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
      <h2 className="text-xl font-bold text-gray-900">الاختبارات</h2>
      {aiUnavailable && <AiUnavailableNotice />}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <SkeletonBlock count={4} className="h-20 w-full" />
      ) : quizzes.length === 0 ? (
        <EmptyState icon={<ListChecks size={32} aria-hidden="true" />} title="لا توجد اختبارات بعد" description="أنشئ اختباراً من أحد ملفاتك." actionLabel="اذهب إلى ملفاتي" actionHref="/study/files" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quizzes.map((q) => (
            <Link key={q.id} href={`/study/quizzes/${q.id}`} className="focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-[12px]">
              <Card hover className="flex items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-800">{q.title}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('ar')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof q.last_score === 'number' && <Badge variant="success">{q.last_score}%</Badge>}
                  <Badge>{DIFF_LABEL[q.difficulty]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
