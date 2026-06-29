/**
 * JO Study — quiz scoring (pure functions, no I/O — fully unit-testable).
 */
import type { QuizQuestion } from './schemas'

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // strip Arabic tatweel and common diacritics for lenient matching
    .replace(/ـ/g, '')
    .replace(/[ً-ْ]/g, '')
}

export interface QuizScoreResult {
  total: number
  /** Number of auto-gradable questions (excludes essay). */
  graded: number
  correct: number
  /** Percentage over graded questions, 0..100. */
  score: number
  perQuestion: Array<{ id: string; correct: boolean | null; gradable: boolean }>
  weakTopics: string[]
}

/**
 * Score a set of answers against quiz questions.
 * - multiple_choice / true_false / short_answer: auto-graded.
 * - essay: not auto-graded (correct = null, gradable = false).
 * Weak topics are derived from the source section/fileName of wrong answers.
 */
export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>,
): QuizScoreResult {
  const perQuestion: QuizScoreResult['perQuestion'] = []
  const weak = new Set<string>()
  let graded = 0
  let correct = 0

  for (const q of questions) {
    const given = answers[q.id]

    if (q.type === 'essay') {
      perQuestion.push({ id: q.id, correct: null, gradable: false })
      continue
    }

    graded++
    const isCorrect =
      given !== undefined && normalize(given) === normalize(q.correctAnswer)

    if (isCorrect) {
      correct++
    } else {
      const topic = q.source?.section ?? q.source?.fileName
      if (topic) weak.add(topic)
    }
    perQuestion.push({ id: q.id, correct: isCorrect, gradable: true })
  }

  const score = graded > 0 ? Math.round((correct / graded) * 10000) / 100 : 0

  return {
    total: questions.length,
    graded,
    correct,
    score,
    perQuestion,
    weakTopics: Array.from(weak),
  }
}
