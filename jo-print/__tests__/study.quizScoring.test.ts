import { describe, it, expect } from 'vitest'
import { scoreQuiz } from '@/lib/study/quizScoring'
import type { QuizQuestion } from '@/lib/study/schemas'

const mc = (id: string, correct: string, section?: string): QuizQuestion => ({
  id, type: 'multiple_choice', question: 'q', options: ['a', 'b', 'c'],
  correctAnswer: correct, explanation: '',
  source: section ? { fileName: 'f.pdf', page: 1, section } : null,
})

describe('scoreQuiz', () => {
  it('scores all-correct as 100', () => {
    const qs = [mc('1', 'a'), mc('2', 'b')]
    const r = scoreQuiz(qs, { '1': 'a', '2': 'b' })
    expect(r.score).toBe(100)
    expect(r.correct).toBe(2)
    expect(r.graded).toBe(2)
  })

  it('scores half correct as 50', () => {
    const qs = [mc('1', 'a'), mc('2', 'b')]
    const r = scoreQuiz(qs, { '1': 'a', '2': 'wrong' })
    expect(r.score).toBe(50)
  })

  it('treats missing answers as wrong', () => {
    const qs = [mc('1', 'a'), mc('2', 'b')]
    const r = scoreQuiz(qs, { '1': 'a' })
    expect(r.correct).toBe(1)
    expect(r.score).toBe(50)
  })

  it('matches answers case- and whitespace-insensitively', () => {
    const qs = [mc('1', 'Paris')]
    const r = scoreQuiz(qs, { '1': '  paris ' })
    expect(r.correct).toBe(1)
  })

  it('excludes essay questions from grading', () => {
    const qs: QuizQuestion[] = [
      mc('1', 'a'),
      { id: '2', type: 'essay', question: 'اشرح', options: [], correctAnswer: '', explanation: '' },
    ]
    const r = scoreQuiz(qs, { '1': 'a', '2': 'long answer' })
    expect(r.total).toBe(2)
    expect(r.graded).toBe(1)
    expect(r.score).toBe(100)
    expect(r.perQuestion.find(p => p.id === '2')?.gradable).toBe(false)
  })

  it('collects weak topics from wrong answers', () => {
    const qs = [mc('1', 'a', 'الفصل الثاني'), mc('2', 'b', 'الفصل الثالث')]
    const r = scoreQuiz(qs, { '1': 'wrong', '2': 'b' })
    expect(r.weakTopics).toContain('الفصل الثاني')
    expect(r.weakTopics).not.toContain('الفصل الثالث')
  })

  it('returns 0 when there are no gradable questions', () => {
    const qs: QuizQuestion[] = [
      { id: '1', type: 'essay', question: 'q', options: [], correctAnswer: '', explanation: '' },
    ]
    const r = scoreQuiz(qs, { '1': 'x' })
    expect(r.score).toBe(0)
    expect(r.graded).toBe(0)
  })
})
