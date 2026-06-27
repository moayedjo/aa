/**
 * JO Study — study files collection.
 * POST: upload educational material. GET: list own files.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { getUserPlanLimits } from '@/lib/study/usage'
import {
  STUDY_ALLOWED_MIME,
  STUDY_MAGIC_BYTES,
  STUDY_FILES_BUCKET,
} from '@/lib/study/config'
import { studyServiceClient } from '@/lib/study/serviceClient'

export const runtime = 'nodejs'

function sanitizeFilename(name: string): string {
  const base = name.replace(/[\/\\]/g, "_").replace(/[\x00-\x1f<>:"|?*]/g, "").trim()
  const cleaned = base.slice(0, 200)
  return cleaned || 'document'
}

function matchesMagic(bytes: Uint8Array, ext: string): boolean {
  const signatures = STUDY_MAGIC_BYTES[ext]
  if (!signatures || signatures.length === 0) return true // e.g. txt — no signature
  return signatures.some(sig => sig.every((b, i) => bytes[i] === b))
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('upload', user.id)) return studyError('RATE_LIMITED')

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return studyError('VALIDATION', 'لم يتم اختيار ملف')

    const ext = STUDY_ALLOWED_MIME[file.type]
    if (!ext) return studyError('VALIDATION', 'نوع الملف غير مدعوم. الأنواع المدعومة: PDF, DOCX, PPTX, TXT')

    const limits = await getUserPlanLimits(supabase, user.id)

    if (file.size > limits.maxFileSizeMB * 1024 * 1024) {
      return studyError('VALIDATION', `حجم الملف يتجاوز الحد المسموح (${limits.maxFileSizeMB}MB)`)
    }

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    if (!matchesMagic(bytes, ext)) {
      return studyError('VALIDATION', 'محتوى الملف لا يطابق النوع المُعلن')
    }

    // Enforce plan maxFiles (count existing non-deleted files).
    const { count, error: countErr } = await supabase
      .from('study_files')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)
    if (countErr) {
      console.error('study files POST count error:', countErr.code)
      return studyError('SERVER_ERROR')
    }
    if ((count ?? 0) >= limits.maxFiles) {
      return studyError('USAGE_LIMIT', `تجاوزت الحد الأقصى لعدد الملفات (${limits.maxFiles})`)
    }

    const safeName = sanitizeFilename(file.name)
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

    const title = (form.get('title') as string | null)?.trim() || safeName
    const subject = (form.get('subject') as string | null)?.trim() || null
    const courseName = (form.get('courseName') as string | null)?.trim() || null
    const schoolName = (form.get('schoolName') as string | null)?.trim() || null
    const semester = (form.get('semester') as string | null)?.trim() || null

    // Upload via service-role storage (private bucket).
    const admin = studyServiceClient()
    const { error: uploadErr } = await admin.storage
      .from(STUDY_FILES_BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })
    if (uploadErr) {
      console.error('study files upload storage error:', uploadErr.message)
      return studyError('SERVER_ERROR', 'فشل في رفع الملف إلى التخزين')
    }

    const { data: row, error: insErr } = await supabase
      .from('study_files')
      .insert({
        user_id: user.id,
        title,
        original_filename: safeName,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        subject,
        course_name: courseName,
        school_name: schoolName,
        semester,
        processing_status: 'uploaded',
      })
      .select()
      .single()

    if (insErr || !row) {
      console.error('study files insert error:', insErr?.code)
      // Best-effort cleanup of the orphaned object.
      await admin.storage.from(STUDY_FILES_BUCKET).remove([storagePath]).catch(() => {})
      return studyError('SERVER_ERROR')
    }

    return studyOk(row, 201)
  } catch (err) {
    console.error('study files POST error:', err instanceof Error ? err.name : 'unknown')
    return studyError('SERVER_ERROR')
  }
}

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  const { data, error } = await supabase
    .from('study_files')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('study files GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  return studyOk(data ?? [])
}
