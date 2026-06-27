/**
 * JO Study — authentication & typed API response helpers for study routes.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

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

const STATUS: Record<StudyErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  USAGE_LIMIT: 429,
  AI_NOT_CONFIGURED: 503,
  AI_INVALID_OUTPUT: 502,
  PROCESSING_ERROR: 422,
  SERVER_ERROR: 500,
}

const DEFAULT_MESSAGE: Record<StudyErrorCode, string> = {
  UNAUTHENTICATED: 'يجب تسجيل الدخول',
  FORBIDDEN: 'غير مصرح لك بالوصول',
  NOT_FOUND: 'العنصر غير موجود',
  VALIDATION: 'بيانات غير صالحة',
  RATE_LIMITED: 'طلبات كثيرة، انتظر قليلاً',
  USAGE_LIMIT: 'تجاوزت الحد المسموح',
  AI_NOT_CONFIGURED: 'ميزات الذكاء الاصطناعي غير مفعّلة حالياً. يمكنك إدارة ملفاتك، وسيتم تفعيل التحليل والتلخيص بعد إعداد مزود الذكاء الاصطناعي.',
  AI_INVALID_OUTPUT: 'تعذر إنشاء المحتوى، يرجى المحاولة مرة أخرى',
  PROCESSING_ERROR: 'تعذر تحليل الملف',
  SERVER_ERROR: 'حدث خطأ، يرجى المحاولة لاحقاً',
}

export function studyError(code: StudyErrorCode, message?: string) {
  return NextResponse.json(
    { error: { code, message: message ?? DEFAULT_MESSAGE[code] } },
    { status: STATUS[code] },
  )
}

export function studyOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export interface AuthedContext {
  supabase: SupabaseClient
  user: User
}

/**
 * Resolve the authenticated user or return a typed 401 response.
 * Usage: const auth = await requireUser(); if ('error' in auth) return auth.error
 */
export async function requireUser(): Promise<AuthedContext | { error: NextResponse }> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: studyError('UNAUTHENTICATED') }
  return { supabase, user }
}
