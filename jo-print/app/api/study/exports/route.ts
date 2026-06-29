/**
 * JO Study — generate a print-ready PDF export from a generated artifact.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { withIdempotency, IdempotencyInProgressError } from '@/lib/study/idempotency'
import { generateExportRequest, summarySchema, quizSchema, flashcardSetSchema } from '@/lib/study/schemas'
import {
  summaryHtml, quizHtml, flashcardsHtml, type DocMeta,
} from '@/lib/study/pdfTemplates'
import { renderHtmlToPdf, getArabicFontDataUri, PdfRenderUnavailableError } from '@/lib/study/pdfExport'
import { STUDY_EXPORTS_BUCKET } from '@/lib/study/config'
import { studyServiceClient } from '@/lib/study/serviceClient'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type SourceType = 'summary' | 'quiz' | 'answer_key' | 'flashcards' | 'study_plan' | 'booklet'

interface BuiltDoc {
  html: string
  title: string
  language: 'ar' | 'en'
}

/**
 * Load + verify the source row (owner-only) and build the export HTML.
 * Returns null with a typed error code if not found / unsupported.
 */
async function buildExportHtml(
  supabase: SupabaseClient,
  userId: string,
  sourceType: SourceType,
  sourceId: string,
  printMode: 'bw' | 'color',
  fontDataUri: string | undefined,
): Promise<{ doc: BuiltDoc } | { errorCode: 'NOT_FOUND' | 'PROCESSING_ERROR'; message?: string }> {
  const meta = (title: string, language: 'ar' | 'en'): DocMeta => ({
    title,
    printMode,
    language,
    generatedAt: new Date().toISOString(),
    fontDataUri,
  })

  if (sourceType === 'summary') {
    const { data } = await supabase
      .from('study_summaries')
      .select('id, user_id, title, language, structured_content')
      .eq('id', sourceId)
      .maybeSingle()
    if (!data || data.user_id !== userId) return { errorCode: 'NOT_FOUND' }
    const parsed = summarySchema.safeParse(data.structured_content)
    if (!parsed.success) return { errorCode: 'PROCESSING_ERROR', message: 'محتوى الملخص غير صالح' }
    const language = (data.language as 'ar' | 'en') ?? 'ar'
    return { doc: { html: summaryHtml(meta(data.title as string, language), parsed.data), title: data.title as string, language } }
  }

  if (sourceType === 'quiz' || sourceType === 'answer_key') {
    const { data } = await supabase
      .from('study_quizzes')
      .select('id, user_id, title, difficulty, questions')
      .eq('id', sourceId)
      .maybeSingle()
    if (!data || data.user_id !== userId) return { errorCode: 'NOT_FOUND' }
    const parsed = quizSchema.safeParse({
      title: data.title,
      difficulty: data.difficulty,
      questions: data.questions,
    })
    if (!parsed.success) return { errorCode: 'PROCESSING_ERROR', message: 'محتوى الاختبار غير صالح' }
    const language: 'ar' | 'en' = 'ar'
    const withAnswers = sourceType === 'answer_key'
    const title = withAnswers ? `${data.title} — نموذج الإجابة` : (data.title as string)
    return { doc: { html: quizHtml(meta(title, language), parsed.data, { withAnswers }), title, language } }
  }

  if (sourceType === 'flashcards') {
    const { data } = await supabase
      .from('study_flashcard_sets')
      .select('id, user_id, title, cards')
      .eq('id', sourceId)
      .maybeSingle()
    if (!data || data.user_id !== userId) return { errorCode: 'NOT_FOUND' }
    const parsed = flashcardSetSchema.safeParse({ title: data.title, cards: data.cards })
    if (!parsed.success) return { errorCode: 'PROCESSING_ERROR', message: 'محتوى البطاقات غير صالح' }
    const language: 'ar' | 'en' = 'ar'
    return { doc: { html: flashcardsHtml(meta(data.title as string, language), parsed.data), title: data.title as string, language } }
  }

  // study_plan / booklet not supported by available templates yet.
  return { errorCode: 'PROCESSING_ERROR', message: 'نوع التصدير غير مدعوم حالياً' }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('export', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = generateExportRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const input = parsed.data

  try {
    const fontDataUri = await getArabicFontDataUri()

    const built = await buildExportHtml(
      supabase, user.id, input.sourceType, input.sourceId, input.printMode, fontDataUri,
    )
    if ('errorCode' in built) {
      return studyError(built.errorCode, built.message)
    }

    const { result, replayed } = await withIdempotency(
      { userId: user.id, key: `${input.sourceType}:${input.sourceId}:${input.printMode}`, feature: 'export' },
      async (): Promise<{ id: string; pageCount: number }> => {
        const rendered = await renderHtmlToPdf(built.doc.html)

        const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`
        const admin = studyServiceClient()
        const { error: upErr } = await admin.storage
          .from(STUDY_EXPORTS_BUCKET)
          .upload(storagePath, rendered.bytes, { contentType: 'application/pdf', upsert: false })
        if (upErr) throw new Error(`export upload failed: ${upErr.message}`)

        const { data: row, error: insErr } = await supabase
          .from('study_exports')
          .insert({
            user_id: user.id,
            source_type: input.sourceType,
            source_id: input.sourceId,
            storage_path: storagePath,
            page_count: rendered.pageCount,
            print_mode: input.printMode,
          })
          .select('id')
          .single()
        if (insErr || !row) {
          await admin.storage.from(STUDY_EXPORTS_BUCKET).remove([storagePath]).catch(() => {})
          throw new Error(`export insert failed: ${insErr?.code ?? 'unknown'}`)
        }
        return { id: row.id as string, pageCount: rendered.pageCount }
      },
    )

    return studyOk({ id: result.id, pageCount: result.pageCount }, replayed ? 200 : 201)
  } catch (err) {
    if (err instanceof PdfRenderUnavailableError) {
      return studyError('PROCESSING_ERROR', 'تعذر تجهيز ملف الطباعة')
    }
    if (err instanceof IdempotencyInProgressError) return studyError('RATE_LIMITED', 'الطلب قيد التنفيذ')
    console.error('exports POST error:', err instanceof Error ? err.name : 'unknown')
    return studyError('SERVER_ERROR')
  }
}
