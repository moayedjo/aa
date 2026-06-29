import { describe, it, expect } from 'vitest'
import { esc, summaryHtml, quizHtml, flashcardsHtml, type DocMeta } from '@/lib/study/pdfTemplates'
import type { StudySummary, StudyQuiz, StudyFlashcardSet } from '@/lib/study/schemas'

const meta = (over: Partial<DocMeta> = {}): DocMeta => ({
  title: 'عنوان',
  printMode: 'bw',
  language: 'ar',
  generatedAt: '2026-06-27T00:00:00.000Z',
  ...over,
})

describe('esc', () => {
  it('escapes <, >, &, ", and \'', () => {
    expect(esc(`<a href="x" id='y'>&`)).toBe('&lt;a href=&quot;x&quot; id=&#39;y&#39;&gt;&amp;')
  })
})

describe('summaryHtml — injection safety', () => {
  const summary: StudySummary = {
    title: '<script>alert(1)</script>',
    summaryType: 'standard',
    overview: 'نظرة',
    mainIdeas: [{ title: 'فكرة', explanation: `</style><img onerror=alert(2)>`, sources: [] }],
    definitions: [],
    keyFacts: [],
    reviewPoints: [],
    practiceQuestions: [],
    warnings: [],
  }

  it('escapes malicious title and explanation', () => {
    const html = summaryHtml(meta({ title: summary.title }), summary)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img onerror')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img onerror')
  })

  it('contains rtl direction and A4 page rule for ar', () => {
    const html = summaryHtml(meta(), summary)
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('@page')
    expect(html).toContain('size: A4')
  })
})

describe('quizHtml — answer disclosure', () => {
  const quiz: StudyQuiz = {
    title: 'اختبار',
    difficulty: 'easy',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'ما هي العاصمة؟',
        options: ['عمان', 'دبي'],
        correctAnswer: 'SECRET_ANSWER_42',
        explanation: '',
      },
    ],
  }

  it('withAnswers:false hides the correct answer', () => {
    const html = quizHtml(meta(), quiz, { withAnswers: false })
    expect(html).not.toContain('SECRET_ANSWER_42')
  })

  it('withAnswers:true reveals the correct answer', () => {
    const html = quizHtml(meta(), quiz, { withAnswers: true })
    expect(html).toContain('SECRET_ANSWER_42')
  })
})

describe('flashcardsHtml', () => {
  const set: StudyFlashcardSet = {
    title: 'بطاقات',
    cards: [{ id: 'c1', front: '<b>front</b>', back: '<i>back</i>', category: '', difficulty: 'medium' }],
  }

  it('escapes front/back and renders rtl/A4', () => {
    const html = flashcardsHtml(meta(), set)
    expect(html).not.toContain('<b>front</b>')
    expect(html).toContain('&lt;b&gt;front&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;back&lt;/i&gt;')
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('size: A4')
  })
})
