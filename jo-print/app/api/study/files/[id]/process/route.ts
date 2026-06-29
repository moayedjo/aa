/**
 * JO Study — extract text from an uploaded file (server-side parsing).
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { getUserPlanLimits } from '@/lib/study/usage'
import { STUDY_ALLOWED_MIME, STUDY_FILES_BUCKET } from '@/lib/study/config'
import { studyServiceClient } from '@/lib/study/serviceClient'
import { parseDocument, FileParseError } from '@/lib/study/fileParse'
import { isValidUUID } from '@/lib/apiHelpers'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!isValidUUID(params.id)) return studyError('VALIDATION')
  if (!await studyRateLimit('process', user.id)) return studyError('RATE_LIMITED')

  // Ownership check.
  const { data: file, error: fetchErr } = await supabase
    .from('study_files')
    .select('id, user_id, storage_path, mime_type, deleted_at')
    .eq('id', params.id)
    .maybeSingle()

  if (fetchErr) {
    console.error('study process fetch error:', fetchErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!file || file.user_id !== user.id || file.deleted_at) return studyError('NOT_FOUND')

  const ext = STUDY_ALLOWED_MIME[file.mime_type as string]
  if (!ext) return studyError('PROCESSING_ERROR', 'نوع الملف غير مدعوم')

  const limits = await getUserPlanLimits(supabase, user.id)

  // Mark processing.
  await supabase
    .from('study_files')
    .update({ processing_status: 'processing', processing_error: null })
    .eq('id', params.id)
    .eq('user_id', user.id)

  try {
    // Download bytes via service-role.
    const admin = studyServiceClient()
    const { data: blob, error: dlErr } = await admin.storage
      .from(STUDY_FILES_BUCKET)
      .download(file.storage_path as string)
    if (dlErr || !blob) {
      throw new FileParseError('تعذر تنزيل الملف من التخزين')
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const parsed = await parseDocument(bytes, ext)

    if (parsed.pageCount !== null && parsed.pageCount > limits.maxPagesPerFile) {
      await supabase
        .from('study_files')
        .update({
          processing_status: 'error',
          processing_error: `عدد الصفحات (${parsed.pageCount}) يتجاوز الحد المسموح (${limits.maxPagesPerFile})`,
        })
        .eq('id', params.id)
        .eq('user_id', user.id)
      return studyError('USAGE_LIMIT', `عدد الصفحات يتجاوز الحد المسموح في باقتك (${limits.maxPagesPerFile})`)
    }

    const { data: row, error: updErr } = await supabase
      .from('study_files')
      .update({
        extracted_text: parsed.text,
        char_count: parsed.charCount,
        page_count: parsed.pageCount,
        language: parsed.language,
        processing_status: 'ready',
        processing_error: null,
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, processing_status, page_count, char_count, language')
      .single()

    if (updErr || !row) {
      console.error('study process update error:', updErr?.code)
      return studyError('SERVER_ERROR')
    }
    return studyOk(row)
  } catch (err) {
    if (err instanceof FileParseError) {
      await supabase
        .from('study_files')
        .update({ processing_status: 'error', processing_error: err.message })
        .eq('id', params.id)
        .eq('user_id', user.id)
      return studyError('PROCESSING_ERROR', err.message)
    }
    console.error('study process error:', err instanceof Error ? err.name : 'unknown')
    await supabase
      .from('study_files')
      .update({ processing_status: 'error', processing_error: 'processing failed' })
      .eq('id', params.id)
      .eq('user_id', user.id)
    return studyError('SERVER_ERROR')
  }
}
