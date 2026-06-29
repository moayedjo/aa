/**
 * JO Study — high-level AI services (single orchestration layer, multiple modes).
 * Each function grounds the model in the file's extracted text, validates the
 * structured output via Zod, and returns validated data + usage.
 */
import { generateStructured } from './generation'
import {
  summarySchema, quizSchema, flashcardSetSchema, chatAnswerSchema,
  type StudySummary, type StudyQuiz, type StudyFlashcardSet, type ChatAnswer,
} from './schemas'
import {
  summarySystemPrompt, quizSystemPrompt, flashcardSystemPrompt,
  chatSystemPrompt, wrapMaterial,
} from './prompts'
import type { AiUsage } from './aiProvider'

export interface MaterialContext {
  fileName: string
  text: string
}

export interface ServiceResult<T> { data: T; usage: AiUsage }

export async function generateSummaryFor(
  material: MaterialContext,
  opts: { summaryType: string; language: string; topic?: string; selectedPages?: string },
): Promise<ServiceResult<StudySummary>> {
  const scope = [
    opts.topic ? `الموضوع المطلوب: ${opts.topic}.` : null,
    opts.selectedPages ? `الصفحات المطلوبة: ${opts.selectedPages}.` : null,
  ].filter(Boolean).join(' ')

  return generateStructured(summarySchema, {
    system: summarySystemPrompt(opts.summaryType),
    user: [
      `لخّص المادة التالية من الملف "${material.fileName}" بلغة ${opts.language}. ${scope}`,
      wrapMaterial(material.text),
    ].join('\n\n'),
  })
}

export async function generateQuizFor(
  material: MaterialContext,
  opts: { quizType: string; difficulty: string; questionCount: number; selectedPages?: string },
): Promise<ServiceResult<StudyQuiz>> {
  return generateStructured(quizSchema, {
    system: quizSystemPrompt(opts.quizType, opts.difficulty),
    user: [
      `أنشئ اختباراً تدريبياً من ${opts.questionCount} سؤالاً من نوع ${opts.quizType} من الملف "${material.fileName}".`,
      opts.selectedPages ? `ركّز على الصفحات: ${opts.selectedPages}.` : '',
      wrapMaterial(material.text),
    ].filter(Boolean).join('\n\n'),
  })
}

export async function generateFlashcardsFor(
  material: MaterialContext,
  opts: { count: number; topic?: string },
): Promise<ServiceResult<StudyFlashcardSet>> {
  return generateStructured(flashcardSetSchema, {
    system: flashcardSystemPrompt(),
    user: [
      `أنشئ ${opts.count} بطاقة حفظ من الملف "${material.fileName}".`,
      opts.topic ? `حول الموضوع: ${opts.topic}.` : '',
      wrapMaterial(material.text),
    ].filter(Boolean).join('\n\n'),
  })
}

export async function answerFromMaterial(
  material: MaterialContext,
  opts: {
    question: string
    mode: 'ask' | 'teacher'
    teacherLevel?: string
    allowGeneralKnowledge: boolean
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  },
): Promise<ServiceResult<ChatAnswer>> {
  const historyText = (opts.history ?? [])
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'الطالب' : 'المساعد'}: ${m.content}`)
    .join('\n')

  return generateStructured(chatAnswerSchema, {
    system: chatSystemPrompt({
      mode: opts.mode,
      teacherLevel: opts.teacherLevel,
      allowGeneralKnowledge: opts.allowGeneralKnowledge,
    }),
    user: [
      historyText ? `سياق المحادثة:\n${historyText}` : '',
      `سؤال الطالب: ${opts.question}`,
      `الملف: "${material.fileName}"`,
      wrapMaterial(material.text),
    ].filter(Boolean).join('\n\n'),
  })
}
