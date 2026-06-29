/**
 * JO Study — central configuration.
 * Single source of truth for plans, usage limits, models, and file rules.
 * Nothing in this file should be duplicated elsewhere.
 */

export type StudyPlanId = 'free' | 'student' | 'print_bundle'

export interface StudyPlanLimits {
  id: StudyPlanId
  labelAr: string
  maxFiles: number
  maxFileSizeMB: number
  maxPagesPerFile: number
  dailyAiRequests: number
  monthlyTokenBudget: number
  maxSummariesPerDay: number
  maxQuizQuestions: number
  maxFlashcards: number
  allowDetailedSummary: boolean
  allowStudyPlans: boolean
  allowExport: boolean
}

export const STUDY_PLANS: Record<StudyPlanId, StudyPlanLimits> = {
  free: {
    id: 'free',
    labelAr: 'مجاني',
    maxFiles: 3,
    maxFileSizeMB: 15,
    maxPagesPerFile: 40,
    dailyAiRequests: 15,
    monthlyTokenBudget: 200_000,
    maxSummariesPerDay: 3,
    maxQuizQuestions: 10,
    maxFlashcards: 20,
    allowDetailedSummary: false,
    allowStudyPlans: false,
    allowExport: true,
  },
  student: {
    id: 'student',
    labelAr: 'الطالب',
    maxFiles: 30,
    maxFileSizeMB: 40,
    maxPagesPerFile: 300,
    dailyAiRequests: 100,
    monthlyTokenBudget: 3_000_000,
    maxSummariesPerDay: 30,
    maxQuizQuestions: 40,
    maxFlashcards: 100,
    allowDetailedSummary: true,
    allowStudyPlans: true,
    allowExport: true,
  },
  print_bundle: {
    id: 'print_bundle',
    labelAr: 'باقة الطباعة',
    maxFiles: 100,
    maxFileSizeMB: 50,
    maxPagesPerFile: 500,
    dailyAiRequests: 250,
    monthlyTokenBudget: 8_000_000,
    maxSummariesPerDay: 80,
    maxQuizQuestions: 50,
    maxFlashcards: 200,
    allowDetailedSummary: true,
    allowStudyPlans: true,
    allowExport: true,
  },
}

export const DEFAULT_PLAN_ID: StudyPlanId = 'free'

export function getPlanLimits(planId: string | null | undefined): StudyPlanLimits {
  if (planId && planId in STUDY_PLANS) return STUDY_PLANS[planId as StudyPlanId]
  return STUDY_PLANS[DEFAULT_PLAN_ID]
}

// ── Allowed upload types ──────────────────────────────────────────────────────
export const STUDY_ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
}

// Magic-byte signatures keyed by canonical extension
export const STUDY_MAGIC_BYTES: Record<string, number[][]> = {
  pdf:  [[0x25, 0x50, 0x44, 0x46]],                  // %PDF
  docx: [[0x50, 0x4b, 0x03, 0x04]],                  // ZIP (OOXML)
  pptx: [[0x50, 0x4b, 0x03, 0x04]],                  // ZIP (OOXML)
  txt:  [],                                           // text has no reliable signature
}

// ── Storage buckets ───────────────────────────────────────────────────────────
export const STUDY_FILES_BUCKET   = 'study-files'
export const STUDY_EXPORTS_BUCKET = 'study-exports'
export const SIGNED_URL_TTL_SECONDS = 15 * 60

// ── AI models / provider config (read server-side only) ───────────────────────
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  // Rough per-1K-token cost estimate for ai_usage accounting (USD).
  inputCostPer1K:  0.00015,
  outputCostPer1K: 0.0006,
  maxRetries: 1, // retry once on invalid structured output
} as const

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

// ── Default print settings for exported study documents ───────────────────────
export const STUDY_EXPORT_DEFAULTS = {
  size: 'A4' as const,
  color: 'blackwhite' as const,
  sides: 'double' as const,
  // summaries get stapled; longer booklets get wire binding (decided at export time)
  bindingSummary: 'staple' as const,
  bindingBooklet: 'wire' as const,
}
