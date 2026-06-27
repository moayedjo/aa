/**
 * JO Study — client-side fetch helpers and shared row types.
 * Every call returns the parsed `data` on success or throws a StudyApiError
 * carrying the Arabic `error.message` and `error.code` from the API contract.
 */

export type StudyErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'USAGE_LIMIT'
  | 'AI_NOT_CONFIGURED'
  | 'AI_INVALID_OUTPUT'
  | 'PROCESSING_ERROR'
  | 'SERVER_ERROR'

export class StudyApiError extends Error {
  code: StudyErrorCode | 'UNKNOWN'
  constructor(message: string, code: StudyErrorCode | 'UNKNOWN') {
    super(message)
    this.name = 'StudyApiError'
    this.code = code
  }
}

interface ApiEnvelope<T> {
  data?: T
  error?: { code?: string; message?: string }
}

const GENERIC_ERROR = 'حدث خطأ، يرجى المحاولة لاحقاً'

async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T> | null = null
  try {
    body = (await res.json()) as ApiEnvelope<T>
  } catch {
    body = null
  }
  if (!res.ok || !body || body.error) {
    const code = (body?.error?.code as StudyErrorCode) ?? 'UNKNOWN'
    const message = body?.error?.message ?? GENERIC_ERROR
    throw new StudyApiError(message, code)
  }
  return (body.data as T)
}

export async function studyGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  return parseEnvelope<T>(res)
}

export async function studyPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return parseEnvelope<T>(res)
}

export async function studyDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE', headers: { Accept: 'application/json' } })
  return parseEnvelope<T>(res)
}

export function isAiUnavailable(err: unknown): boolean {
  return err instanceof StudyApiError && err.code === 'AI_NOT_CONFIGURED'
}

export function errorMessage(err: unknown): string {
  if (err instanceof StudyApiError) return err.message
  if (err instanceof Error && err.message) return err.message
  return GENERIC_ERROR
}

// ── Row shapes returned by the API (snake_case from Supabase) ─────────────────
export type ProcessingStatus = 'uploaded' | 'processing' | 'ready' | 'error'

export interface StudyFileRow {
  id: string
  user_id: string
  title: string
  original_filename: string
  storage_path: string
  mime_type: string
  file_size: number
  subject: string | null
  course_name: string | null
  school_name: string | null
  semester: string | null
  processing_status: ProcessingStatus
  processing_error: string | null
  page_count: number | null
  char_count: number | null
  language: string | null
  created_at: string
}

export interface SummaryRow {
  id: string
  study_file_id: string
  title: string
  summary_type: 'quick' | 'standard' | 'detailed' | 'exam_night'
  structured_content: unknown
  content: string | null
  language: string
  created_at: string
}

export interface QuizRow {
  id: string
  study_file_id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  quiz_type?: string
  question_count?: number
  settings?: unknown
  /** AI-generated questions (stored column). */
  questions?: unknown
  created_at: string
  last_score?: number | null
}

export interface FlashcardSetRow {
  id: string
  study_file_id: string
  title: string
  /** AI-generated cards (stored column). */
  cards?: unknown
  created_at: string
}

export interface ExportRow {
  id: string
  source_type: 'summary' | 'quiz' | 'answer_key' | 'flashcards' | 'study_plan' | 'booklet'
  source_id: string
  title: string
  page_count: number | null
  print_mode: 'bw' | 'color'
  created_at: string
}

export interface ConversationMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  foundInMaterial?: boolean
  isGeneralKnowledge?: boolean
  citations?: { fileName: string; page?: number | null; section?: string }[]
  confidence?: 'high' | 'medium' | 'low'
}

export interface ConversationRow {
  id: string
  study_file_id: string
  title?: string | null
  messages: ConversationMessage[]
  created_at?: string
}
