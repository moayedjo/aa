'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Layers, AlertCircle, ChevronLeft, ChevronRight, Shuffle,
  Check, RotateCcw, Loader2,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/study/EmptyState'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import AiUnavailableNotice from '@/components/study/AiUnavailableNotice'
import PrintWithJoPrint from '@/components/study/PrintWithJoPrint'
import { studyGet, studyPost, errorMessage, isAiUnavailable, type FlashcardSetRow } from '@/lib/study/client'
import { flashcardSetSchema, type Flashcard } from '@/lib/study/schemas'

export default function StudyFlashcardsPage() {
  const [sets, setSets] = useState<FlashcardSetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [activeSetId, setActiveSetId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    studyGet<FlashcardSetRow[]>('/api/study/flashcards')
      .then((d) => { if (!cancelled) setSets(d) })
      .catch((err) => {
        if (cancelled) return
        if (isAiUnavailable(err)) setAiUnavailable(true)
        else setError(errorMessage(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const activeSet = sets.find((s) => s.id === activeSetId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">بطاقات الحفظ</h2>
      {aiUnavailable && <AiUnavailableNotice />}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <SkeletonBlock count={3} className="h-20 w-full" />
      ) : sets.length === 0 ? (
        <EmptyState icon={<Layers size={32} aria-hidden="true" />} title="لا توجد بطاقات بعد" description="أنشئ مجموعة بطاقات من أحد ملفاتك." actionLabel="اذهب إلى ملفاتي" actionHref="/study/files" />
      ) : activeSet ? (
        <StudyMode set={activeSet} onExit={() => setActiveSetId(null)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sets.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="truncate font-bold text-gray-800">{s.title}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ar')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PrintWithJoPrint sourceType="flashcards" sourceId={s.id} label="طباعة" size="sm" />
                <button type="button" onClick={() => setActiveSetId(s.id)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50">ابدأ المذاكرة</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StudyMode({ set, onExit }: { set: FlashcardSetRow; onExit: () => void }) {
  const allCards: Flashcard[] = useMemo(() => {
    const parsed = flashcardSetSchema.safeParse({ title: set.title, cards: set.cards })
    return parsed.success ? parsed.data.cards : []
  }, [set.title, set.cards])

  const topics = useMemo(
    () => Array.from(new Set(allCards.map((c) => c.category).filter((c): c is string => !!c))),
    [allCards],
  )

  const [topic, setTopic] = useState<string>('')
  const [order, setOrder] = useState<number[]>(() => allCards.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [savingCardId, setSavingCardId] = useState<string | null>(null)

  const filtered = useMemo(
    () => order.filter((i) => !topic || allCards[i]?.category === topic),
    [order, topic, allCards],
  )

  if (allCards.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6 text-sm text-gray-600">
        <p>تعذر عرض محتوى هذه المجموعة.</p>
        <button type="button" onClick={onExit} className="font-medium text-primary hover:underline">رجوع</button>
      </Card>
    )
  }

  const cardIndex = filtered[Math.min(pos, filtered.length - 1)] ?? filtered[0]
  const card = allCards[cardIndex]

  function go(delta: number) {
    setFlipped(false)
    setPos((p) => Math.max(0, Math.min(filtered.length - 1, p + delta)))
  }

  function shuffle() {
    const next = [...order]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setOrder(next)
    setPos(0)
    setFlipped(false)
  }

  async function mark(status: 'known' | 'review') {
    if (!card) return
    setSavingCardId(card.id)
    setProgressError(null)
    try {
      await studyPost('/api/study/flashcards/progress', { flashcardSetId: set.id, cardId: card.id, status })
      if (pos < filtered.length - 1) go(1)
    } catch (err) {
      setProgressError(errorMessage(err))
    } finally {
      setSavingCardId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="text-sm text-primary hover:underline">‹ كل المجموعات</button>
        <div className="flex items-center gap-2">
          {topics.length > 0 && (
            <select value={topic} onChange={(e) => { setTopic(e.target.value); setPos(0); setFlipped(false) }} aria-label="تصفية حسب الموضوع"
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">كل المواضيع</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button type="button" onClick={shuffle} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-gray-600 hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
            <Shuffle size={15} aria-hidden="true" /> خلط
          </button>
          <PrintWithJoPrint sourceType="flashcards" sourceId={set.id} label="طباعة" size="sm" />
        </div>
      </div>

      <p className="text-center text-sm text-gray-400">بطاقة {filtered.length === 0 ? 0 : Math.min(pos + 1, filtered.length)} من {filtered.length}</p>

      {/* Flip card */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'إظهار الوجه الأمامي' : 'إظهار الإجابة'}
        className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-[12px] border border-border bg-white p-8 text-center shadow-sm transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{flipped ? 'الإجابة' : 'السؤال'}</span>
        <span className="text-lg leading-relaxed text-gray-800">{flipped ? card?.back : card?.front}</span>
        {card?.sourcePage != null && <span className="text-xs text-gray-400">صفحة {card.sourcePage}</span>}
      </button>

      {progressError && (
        <p role="alert" className="text-center text-sm text-red-600">{progressError}</p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} disabled={pos === 0} aria-label="السابق" className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm text-gray-600 hover:border-primary disabled:opacity-40">
          <ChevronRight size={16} aria-hidden="true" /> السابق
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => mark('review')} disabled={savingCardId === card?.id} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50">
            {savingCardId === card?.id ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />} للمراجعة
          </button>
          <button type="button" onClick={() => mark('known')} disabled={savingCardId === card?.id} className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50">
            {savingCardId === card?.id ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} أعرفها
          </button>
        </div>
        <button type="button" onClick={() => go(1)} disabled={pos >= filtered.length - 1} aria-label="التالي" className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm text-gray-600 hover:border-primary disabled:opacity-40">
          التالي <ChevronLeft size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
