import { describe, it, expect } from 'vitest'
import {
  summarySchema, quizSchema, flashcardSetSchema, chatAnswerSchema,
  generateQuizRequest, generateSummaryRequest,
} from '@/lib/study/schemas'

describe('study schemas — AI output validation', () => {
  it('accepts a valid summary and applies array defaults', () => {
    const parsed = summarySchema.parse({
      title: 'الفصل الأول',
      summaryType: 'standard',
      overview: 'نظرة عامة',
      mainIdeas: [{ title: 'فكرة', explanation: 'شرح', sources: [{ fileName: 'a.pdf', page: 2 }] }],
    })
    expect(parsed.keyFacts).toEqual([])
    expect(parsed.definitions).toEqual([])
    expect(parsed.mainIdeas[0].sources[0].page).toBe(2)
  })

  it('rejects a summary with an invalid summaryType', () => {
    expect(() => summarySchema.parse({
      title: 'x', summaryType: 'bogus', overview: '',
    })).toThrow()
  })

  it('rejects a quiz with zero questions', () => {
    expect(() => quizSchema.parse({ title: 'q', difficulty: 'easy', questions: [] })).toThrow()
  })

  it('accepts a valid quiz', () => {
    const q = quizSchema.parse({
      title: 'اختبار',
      difficulty: 'medium',
      questions: [{
        id: 'q1', type: 'true_false', question: 'صح؟',
        options: ['صح', 'خطأ'], correctAnswer: 'صح', explanation: '',
      }],
    })
    expect(q.questions).toHaveLength(1)
  })

  it('rejects a flashcard set with no cards', () => {
    expect(() => flashcardSetSchema.parse({ title: 't', cards: [] })).toThrow()
  })

  it('chat answer defaults isGeneralKnowledge to false', () => {
    const a = chatAnswerSchema.parse({ answer: 'x', foundInMaterial: true })
    expect(a.isGeneralKnowledge).toBe(false)
    expect(a.confidence).toBe('medium')
  })

  it('quiz request enforces questionCount bounds', () => {
    expect(() => generateQuizRequest.parse({
      studyFileId: '00000000-0000-0000-0000-000000000000',
      quizType: 'mixed', questionCount: 999,
    })).toThrow()
  })

  it('summary request requires a uuid studyFileId', () => {
    expect(() => generateSummaryRequest.parse({
      studyFileId: 'not-a-uuid', summaryType: 'quick',
    })).toThrow()
  })
})
