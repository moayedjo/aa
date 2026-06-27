import { describe, it, expect } from 'vitest'
import { scoreQuiz } from '@/lib/study/quizScoring'
import type { QuizQuestion } from '@/lib/study/schemas'

const questions: QuizQuestion[] = [
  { id: 'q1', type: 'multiple_choice', question: 'a', options: ['x', 'y'], correctAnswer: 'x', explanation: '' },
  { id: 'q2', type: 'true_false', question: 'b', options: [], correctAnswer: 'صح', explanation: '' },
]

describe('scoreQuiz — server-authoritative scoring', () => {
  it('all-correct answers yield 100, ignoring any client-claimed score', () => {
    const r = scoreQuiz(questions, { q1: 'x', q2: 'صح' })
    expect(r.score).toBe(100)
    expect(r.correct).toBe(2)
  })

  it('all-wrong answers yield 0 regardless of a tampered high score', () => {
    // A malicious client could claim score=100; scoreQuiz derives only from answers.
    const r = scoreQuiz(questions, { q1: 'WRONG', q2: 'WRONG' })
    expect(r.score).toBe(0)
    expect(r.correct).toBe(0)
  })

  it('score is a pure function of (questions, answers) — no score input exists', () => {
    // The API contract: scoreQuiz takes only questions + answers.
    expect(scoreQuiz.length).toBe(2)
  })
})
