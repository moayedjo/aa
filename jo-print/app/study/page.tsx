'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Upload, FileText, FileSearch, MessageCircleQuestion, ListChecks,
  Layers, Printer, BookOpen, ClipboardList, AlertCircle,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import StudyActionCard from '@/components/study/StudyActionCard'
import FileCard from '@/components/study/FileCard'
import EmptyState from '@/components/study/EmptyState'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import AiUnavailableNotice from '@/components/study/AiUnavailableNotice'
import {
  studyGet, errorMessage, isAiUnavailable,
  type StudyFileRow, type SummaryRow, type QuizRow, type FlashcardSetRow,
} from '@/lib/study/client'

interface DashboardState {
  files: StudyFileRow[]
  summaries: SummaryRow[]
  quizzes: QuizRow[]
  flashcards: FlashcardSetRow[]
}

export default function StudyDashboardPage() {
  const [state, setState] = useState<DashboardState>({ files: [], summaries: [], quizzes: [], flashcards: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Files always work (no AI). Load first so file management is usable even if AI is off.
        const files = await studyGet<StudyFileRow[]>('/api/study/files')
        if (cancelled) return
        setState((s) => ({ ...s, files }))
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }

      // AI-backed lists: tolerate empty / AI_NOT_CONFIGURED individually.
      const ai: Array<[keyof DashboardState, string]> = [
        ['summaries', '/api/study/summaries'],
        ['quizzes', '/api/study/quizzes'],
        ['flashcards', '/api/study/flashcards'],
      ]
      for (const [key, url] of ai) {
        try {
          const data = await studyGet<DashboardState[typeof key]>(url)
          if (!cancelled) setState((s) => ({ ...s, [key]: data }))
        } catch (err) {
          if (isAiUnavailable(err) && !cancelled) setAiUnavailable(true)
          // non-blocking: ignore other errors for secondary lists
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const recentFiles = state.files.slice(0, 4)

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome + upload */}
      <section className="flex flex-col gap-4 rounded-[12px] border border-border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">مرحباً بك في JO Study</h2>
          <p className="mt-1 text-sm text-gray-500">
            ارفع موادك الدراسية، ولخّصها، واسأل عنها، وجهّزها للطباعة عبر JO-PRINT.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/study/upload"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Upload size={17} aria-hidden="true" /> رفع ملف
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Printer size={17} aria-hidden="true" /> سلة الطباعة
          </Link>
        </div>
      </section>

      {aiUnavailable && <AiUnavailableNotice />}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {/* Action cards */}
      <section aria-labelledby="actions-h">
        <h2 id="actions-h" className="mb-3 text-base font-bold text-gray-900">ماذا تريد أن تفعل؟</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StudyActionCard href="/study/summaries" title="لخّص المادة" description="ملخصات سريعة أو مفصّلة أو لليلة الامتحان." icon={<FileSearch size={22} aria-hidden="true" />} />
          <StudyActionCard href="/study/files" title="اسأل الملف" description="محادثة مبنية على محتوى ملفك مع المصادر." icon={<MessageCircleQuestion size={22} aria-hidden="true" />} />
          <StudyActionCard href="/study/quizzes" title="أنشئ اختباراً" description="أسئلة اختيار وصح/خطأ ومقالية مع التصحيح." icon={<ListChecks size={22} aria-hidden="true" />} />
          <StudyActionCard href="/study/flashcards" title="أنشئ بطاقات حفظ" description="بطاقات للمراجعة السريعة وتتبع تقدمك." icon={<Layers size={22} aria-hidden="true" />} />
          <StudyActionCard href="/study/exports" title="جهّز الملف للطباعة" description="حوّل ملخصاتك واختباراتك إلى مستند للطباعة." icon={<Printer size={22} aria-hidden="true" />} />
        </div>
      </section>

      {/* Recent files */}
      <section aria-labelledby="files-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="files-h" className="text-base font-bold text-gray-900">أحدث الملفات</h2>
          <Link href="/study/files" className="text-sm font-medium text-primary hover:underline">عرض الكل</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><SkeletonBlock count={4} className="h-28 w-full" /></div>
        ) : recentFiles.length === 0 ? (
          <EmptyState icon={<FileText size={32} aria-hidden="true" />} title="لا توجد ملفات بعد" description="ابدأ برفع أول مادة دراسية." actionLabel="رفع ملف" actionHref="/study/upload" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {recentFiles.map((f) => <FileCard key={f.id} file={f} />)}
          </div>
        )}
      </section>

      {/* Recent summaries / quizzes / flashcards summary row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentList title="أحدث الملخصات" href="/study/summaries" icon={<BookOpen size={18} aria-hidden="true" />} loading={loading} items={state.summaries.slice(0, 3).map((s) => ({ id: s.id, label: s.title, href: '/study/summaries' }))} emptyLabel="لا توجد ملخصات بعد" />
        <RecentList title="نتائج الاختبارات" href="/study/quizzes" icon={<ClipboardList size={18} aria-hidden="true" />} loading={loading} items={state.quizzes.slice(0, 3).map((q) => ({ id: q.id, label: q.title, href: `/study/quizzes/${q.id}`, meta: typeof q.last_score === 'number' ? `${q.last_score}%` : undefined }))} emptyLabel="لا توجد اختبارات بعد" />
        <RecentList title="بطاقات الحفظ" href="/study/flashcards" icon={<Layers size={18} aria-hidden="true" />} loading={loading} items={state.flashcards.slice(0, 3).map((c) => ({ id: c.id, label: c.title, href: '/study/flashcards' }))} emptyLabel="لا توجد بطاقات بعد" />
      </section>

      {/* Usage summary */}
      <section aria-labelledby="usage-h">
        <h2 id="usage-h" className="mb-3 text-base font-bold text-gray-900">ملخص الاستخدام</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <UsageStat label="الملفات" value={state.files.length} />
          <UsageStat label="الملخصات" value={state.summaries.length} />
          <UsageStat label="الاختبارات" value={state.quizzes.length} />
          <UsageStat label="بطاقات الحفظ" value={state.flashcards.length} />
        </div>
      </section>
    </div>
  )
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </Card>
  )
}

interface RecentItem { id: string; label: string; href: string; meta?: string }
function RecentList({ title, href, icon, items, loading, emptyLabel }: {
  title: string; href: string; icon: React.ReactNode; items: RecentItem[]; loading: boolean; emptyLabel: string
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold text-gray-800">
          <span className="text-primary">{icon}</span>{title}
        </span>
        <Link href={href} className="text-xs font-medium text-primary hover:underline">عرض الكل</Link>
      </div>
      {loading ? (
        <SkeletonBlock count={3} className="h-8 w-full" />
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={it.href} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                <span className="truncate">{it.label}</span>
                {it.meta && <span className="shrink-0 text-xs font-medium text-primary">{it.meta}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
