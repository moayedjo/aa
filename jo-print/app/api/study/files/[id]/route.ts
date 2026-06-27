/**
 * JO Study — single study file.
 * GET: own file metadata. DELETE: soft-delete + remove storage object.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { STUDY_FILES_BUCKET } from '@/lib/study/config'
import { studyServiceClient } from '@/lib/study/serviceClient'
import { isValidUUID } from '@/lib/apiHelpers'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!isValidUUID(params.id)) return studyError('VALIDATION')
  if (!await studyRateLimit('files_read', user.id)) return studyError('RATE_LIMITED')

  const { data, error } = await supabase
    .from('study_files')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('study file GET error:', error.code)
    return studyError('SERVER_ERROR')
  }
  if (!data || data.user_id !== user.id) return studyError('NOT_FOUND')
  return studyOk(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!isValidUUID(params.id)) return studyError('VALIDATION')
  if (!await studyRateLimit('delete', user.id)) return studyError('RATE_LIMITED')

  // Verify ownership first.
  const { data: file, error: fetchErr } = await supabase
    .from('study_files')
    .select('id, user_id, storage_path, deleted_at')
    .eq('id', params.id)
    .maybeSingle()

  if (fetchErr) {
    console.error('study file DELETE fetch error:', fetchErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!file || file.user_id !== user.id || file.deleted_at) return studyError('NOT_FOUND')

  // Remove the storage object via service-role.
  try {
    const admin = studyServiceClient()
    await admin.storage.from(STUDY_FILES_BUCKET).remove([file.storage_path as string])
  } catch (err) {
    // Log but continue to soft-delete the row.
    console.error('study file DELETE storage error:', err instanceof Error ? err.name : 'unknown')
  }

  const { error: updErr } = await supabase
    .from('study_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (updErr) {
    console.error('study file DELETE update error:', updErr.code)
    return studyError('SERVER_ERROR')
  }
  return studyOk({ id: params.id, deleted: true })
}
