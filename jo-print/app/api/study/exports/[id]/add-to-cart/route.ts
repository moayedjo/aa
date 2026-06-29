/**
 * JO Study — turn an export into a print cart-item descriptor.
 * Ownership-checked so a user can only add their own exports.
 * Price is display-only; the order API recomputes authoritatively.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { buildStudyCartItem, type StudyExportForCart } from '@/lib/study/cartExport'
import { isValidUUID } from '@/lib/apiHelpers'

export const runtime = 'nodejs'

const SOURCE_LABELS: Record<StudyExportForCart['sourceType'], string> = {
  summary: 'ملخص',
  quiz: 'اختبار',
  answer_key: 'نموذج إجابة',
  flashcards: 'بطاقات حفظ',
  study_plan: 'خطة دراسية',
  booklet: 'كتيّب',
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!isValidUUID(params.id)) return studyError('VALIDATION')
  if (!await studyRateLimit('cart', user.id)) return studyError('RATE_LIMITED')

  const { data: exp, error } = await supabase
    .from('study_exports')
    .select('id, user_id, source_type, source_id, page_count, print_mode')
    .eq('id', params.id)
    .maybeSingle()
  if (error) {
    console.error('export add-to-cart fetch error:', error.code)
    return studyError('SERVER_ERROR')
  }
  if (!exp || exp.user_id !== user.id) return studyError('NOT_FOUND')

  const sourceType = exp.source_type as StudyExportForCart['sourceType']
  const title = `${SOURCE_LABELS[sourceType] ?? 'مستند'} JO Study`

  const forCart: StudyExportForCart = {
    id: exp.id as string,
    sourceType,
    title,
    pageCount: (exp.page_count as number | null) ?? 1,
    printMode: (exp.print_mode as 'bw' | 'color') ?? 'bw',
  }

  const cartItem = buildStudyCartItem(forCart)
  return studyOk({ cartItem })
}
