/**
 * JO Study — Zod schemas for all AI structured outputs and request bodies.
 * Every AI response MUST be validated against these before being stored.
 */
import { z } from 'zod'

// ── Shared ────────────────────────────────────────────────────────────────────
export const citationSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string(),
  page: z.number().int().positive().nullable().optional(),
  section: z.string().optional(),
})
export type Citation = z.infer<typeof citationSchema>

export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export const languageSchema = z.enum(['ar', 'en'])

// ── Summary ─────────────────────────────────────────────────────────────────
export const summaryTypeSchema = z.enum(['quick', 'standard', 'detailed', 'exam_night'])

export const summarySchema = z.object({
  title: z.string().min(1),
  summaryType: summaryTypeSchema,
  overview: z.string(),
  mainIdeas: z.array(z.object({
    title: z.string(),
    explanation: z.string(),
    sources: z.array(citationSchema).default([]),
  })).default([]),
  definitions: z.array(z.object({
    term: z.string(),
    definition: z.string(),
    page: z.number().int().positive().nullable().optional(),
  })).default([]),
  keyFacts: z.array(z.string()).default([]),
  reviewPoints: z.array(z.string()).default([]),
  practiceQuestions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})
export type StudySummary = z.infer<typeof summarySchema>

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const quizTypeSchema = z.enum([
  'multiple_choice', 'true_false', 'short_answer', 'essay', 'mixed',
])

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  question: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string(),
  explanation: z.string().default(''),
  source: citationSchema.nullable().optional(),
})
export type QuizQuestion = z.infer<typeof quizQuestionSchema>

export const quizSchema = z.object({
  title: z.string().min(1),
  difficulty: difficultySchema,
  questions: z.array(quizQuestionSchema).min(1),
})
export type StudyQuiz = z.infer<typeof quizSchema>

// ── Flashcards ──────────────────────────────────────────────────────────────
export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  category: z.string().default(''),
  difficulty: difficultySchema.default('medium'),
  sourcePage: z.number().int().positive().nullable().optional(),
})
export type Flashcard = z.infer<typeof flashcardSchema>

export const flashcardSetSchema = z.object({
  title: z.string().min(1),
  cards: z.array(flashcardSchema).min(1),
})
export type StudyFlashcardSet = z.infer<typeof flashcardSetSchema>

// ── Study plan ────────────────────────────────────────────────────────────────
export const studyPlanTaskSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['study', 'revision', 'quiz', 'flashcard', 'final_review', 'rest']),
  title: z.string().min(1),
  detail: z.string().default(''),
  estimatedHours: z.number().nonnegative().default(0),
})

export const studyPlanDaySchema = z.object({
  date: z.string(),            // ISO date
  tasks: z.array(studyPlanTaskSchema).default([]),
})

export const studyPlanSchema = z.object({
  title: z.string().min(1),
  days: z.array(studyPlanDaySchema).default([]),
})
export type StudyPlan = z.infer<typeof studyPlanSchema>

// ── Chat / grounded answer ────────────────────────────────────────────────────
export const chatAnswerSchema = z.object({
  answer: z.string(),
  foundInMaterial: z.boolean(),
  isGeneralKnowledge: z.boolean().default(false),
  citations: z.array(citationSchema).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
})
export type ChatAnswer = z.infer<typeof chatAnswerSchema>

// ── API request bodies ────────────────────────────────────────────────────────
export const generateSummaryRequest = z.object({
  studyFileId: z.string().uuid(),
  summaryType: summaryTypeSchema,
  selectedPages: z.string().optional(),
  selectedSections: z.string().optional(),
  topic: z.string().optional(),
  language: languageSchema.default('ar'),
  idempotencyKey: z.string().optional(),
})

export const chatRequest = z.object({
  conversationId: z.string().uuid().optional(),
  studyFileId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  mode: z.enum(['ask', 'teacher']).default('ask'),
  teacherLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  allowGeneralKnowledge: z.boolean().default(false),
})

export const generateQuizRequest = z.object({
  studyFileId: z.string().uuid(),
  quizType: quizTypeSchema,
  difficulty: difficultySchema.default('medium'),
  questionCount: z.number().int().min(1).max(50),
  selectedPages: z.string().optional(),
  settings: z.object({
    timeLimit: z.number().int().positive().optional(),
    shuffle: z.boolean().default(false),
    showAnswersImmediately: z.boolean().default(false),
  }).optional(),
  idempotencyKey: z.string().optional(),
})

export const submitQuizRequest = z.object({
  answers: z.record(z.string(), z.string()),
})

export const generateFlashcardsRequest = z.object({
  studyFileId: z.string().uuid(),
  count: z.number().int().min(1).max(200),
  topic: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

export const flashcardProgressRequest = z.object({
  flashcardSetId: z.string().uuid(),
  cardId: z.string().min(1),
  status: z.enum(['new', 'known', 'review']),
})

export const generatePlanRequest = z.object({
  title: z.string().min(1),
  examDate: z.string(),               // ISO date
  dailyHours: z.number().positive().max(16),
  availableDays: z.array(z.string()).default([]),
  selectedFileIds: z.array(z.string().uuid()).default([]),
  knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  idempotencyKey: z.string().optional(),
})

export const generateExportRequest = z.object({
  sourceType: z.enum(['summary', 'quiz', 'answer_key', 'flashcards', 'study_plan', 'booklet']),
  sourceId: z.string().uuid(),
  printMode: z.enum(['bw', 'color']).default('bw'),
})

export type GenerateSummaryRequest = z.infer<typeof generateSummaryRequest>
export type ChatRequestBody = z.infer<typeof chatRequest>
export type GenerateQuizRequest = z.infer<typeof generateQuizRequest>
export type GenerateFlashcardsRequest = z.infer<typeof generateFlashcardsRequest>
export type GeneratePlanRequest = z.infer<typeof generatePlanRequest>
export type GenerateExportRequest = z.infer<typeof generateExportRequest>
