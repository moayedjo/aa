'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import SkeletonBlock from '@/components/study/SkeletonBlock'
import PrintWithJoPrint from '@/components/study/PrintWithJoPrint'
import { studyGet, studyPost, errorMessage, type QuizRow } from '@/lib/study/client'
import { quizSchema, type StudyQuiz, type QuizQuestion } from '@/lib/study/schemas'

/** Mirrors the authoritative server response from POST /submit. */
interface SubmitResult {
  score: number
  correct: number
  graded: number
  total: number
  weakTopics: string[]
  perQuestion: Array<{ id: string; correct: boolean | null; gradable: boolean }>
}

export default function TakeQuizPage() {
  const { id } = useParams<{ id: string }>()
  const [quiz, setQuiz] = useState<StudyQuiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  useEffect(() => {
    let cancelled = false
    studyGet<QuizRow>(`/api/study/quizzes/${id}`)
      .then((row) => {
        if (cancelled) return
        const parsed = quizSchema.safeParse({
          title: row.title,
          difficulty: row.difficulty,
          questions: row.questions,
        })
        if (parsed.success) setQuiz(parsed.data)
        else setError('تعذر عرض محتوى الاختبار')
      })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await studyPost<SubmitResult>(`/api/study/quizzes/${id}/submit`, { answers })
      setResult(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex flex-col gap-4"><SkeletonBlock className="h-20 w-full" /><SkeletonBlock count={3} className="h-28 w-full" /></div>

  if (error && !quiz) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <span className="flex items-center gap-2"><AlertCircle size={18} aria-hidden="true" /> {error}</span>
        <Link href="/study/quizzes" className="font-medium text-primary hover:underline">العودة إلى الاختبارات</Link>
      </div>
    )
  }
  if (!quiz) return null

  const resultById = new Map(result?.perQuestion.map((r) => [r.id, r]))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/study/quizzes" className="text-sm text-primary hover:underline">‹ الاختبارات</Link>
      <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>

      {result && (
        <Card className="flex flex-col gap-3 p-6">
          <p className="text-lg font-bold text-gray-900">النتيجة: <span className="text-primary">{result.score}%</span></p>
          <p className="text-sm text-gray-600">أجبت بشكل صحيح على {result.correct} من {result.graded} سؤالاً مُصحَّحاً (إجمالي الأسئلة {result.total}).</p>
          {result.weakTopics.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">مواضيع تحتاج مراجعة:</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {result.weakTopics.map((t, i) => <li key={i} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">{t}</li>)}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <PrintWithJoPrint sourceType="quiz" sourceId={id} label="طباعة ورقة الأسئلة" size="sm" />
            <PrintWithJoPrint sourceType="answer_key" sourceId={id} label="طباعة نموذج الإجابة" size="sm" />
          </div>
        </Card>
      )}

      <ol className="flex flex-col gap-4">
        {quiz.questions.map((q, idx) => (
          <li key={q.id}>
            <QuestionCard
              index={idx + 1}
              question={q}
              value={answers[q.id] ?? ''}
              onChange={(v) => setAnswer(q.id, v)}
              disabled={!!result}
              result={resultById.get(q.id)}
            />
          </li>
        ))}
      </ol>

      {error && quiz && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </div>
      )}

      {!result && (
        <button type="button" onClick={submit} disabled={submitting}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-6 py-3 text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
          {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} إرسال الإجابات
        </button>
      )}
    </div>
  )
}

function QuestionCard({ index, question, value, onChange, disabled, result }: {
  index: number; question: QuizQuestion; value: string; onChange: (v: string) => void; disabled: boolean
  result?: { correct: boolean | null; gradable: boolean }
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 font-bold text-primary">{index}.</span>
        <p className="font-medium text-gray-800">{question.question}</p>
        {result && result.gradable && (
          result.correct
            ? <CheckCircle2 size={18} className="mr-auto shrink-0 text-green-600" aria-label="إجابة صحيحة" />
            : <XCircle size={18} className="mr-auto shrink-0 text-red-500" aria-label="إجابة خاطئة" />
        )}
      </div>

      {question.type === 'multiple_choice' && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => (
            <label key={i} className={'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ' + (value === opt ? 'border-primary bg-primary/5' : 'border-border')}>
              <input type="radio" name={question.id} value={opt} checked={value === opt} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-4 w-4 text-primary focus:ring-primary/40" />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-2">
          {['صح', 'خطأ'].map((opt) => (
            <label key={opt} className={'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-sm ' + (value === opt ? 'border-primary bg-primary/5' : 'border-border')}>
              <input type="radio" name={question.id} value={opt} checked={value === opt} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="sr-only" />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {(question.type === 'short_answer' || question.type === 'essay') && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={question.type === 'essay' ? 5 : 2}
          placeholder="اكتب إجابتك…"
          aria-label={`إجابة السؤال ${index}`}
          className="resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-surface"
        />
      )}

      {result && result.gradable && (
        <div className={'rounded-lg p-3 text-sm ' + (result.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
          {!result.correct && <p className="mb-1"><span className="font-medium">الإجابة الصحيحة: </span>{question.correctAnswer}</p>}
          {question.explanation && <p className="leading-relaxed">{question.explanation}</p>}
        </div>
      )}
      {result && !result.gradable && question.explanation && (
        <div className="rounded-lg bg-surface p-3 text-sm text-gray-600">
          <p className="mb-1 font-medium text-gray-700">نموذج للإجابة:</p>
          <p className="leading-relaxed">{question.correctAnswer}</p>
          <p className="mt-1 leading-relaxed">{question.explanation}</p>
        </div>
      )}
      {result && question.source && (question.source.fileName || question.source.section) && (
        <p className="text-xs text-gray-400">
          المصدر: {question.source.fileName}
          {question.source.section ? ` — ${question.source.section}` : ''}
          {question.source.page != null ? ` (صفحة ${question.source.page})` : ''}
        </p>
      )}
    </Card>
  )
}
