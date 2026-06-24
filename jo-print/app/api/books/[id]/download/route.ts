import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SIGNED_URL_TTL = 60 * 15 // 15 minutes

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })

  // Verify purchase
  const { data: purchase } = await supabase
    .from('book_purchases')
    .select('id, download_count, book_id')
    .eq('book_id', params.id)
    .eq('user_id', user.id)
    .in('purchase_type', ['digital', 'bundle'])
    .maybeSingle()

  if (!purchase) return NextResponse.json({ error: 'لم تقم بشراء هذا الملخص' }, { status: 403 })

  // Fetch book file path
  const { data: book } = await supabase
    .from('books')
    .select('file_path, download_limit, title')
    .eq('id', params.id)
    .single()

  if (!book?.file_path) return NextResponse.json({ error: 'الملف غير متاح حالياً' }, { status: 404 })

  // Check download limit
  const limit = book.download_limit ?? 5
  if (purchase.download_count >= limit) {
    return NextResponse.json({ error: `تجاوزت الحد الأقصى للتحميل (${limit} مرات). تواصل مع الدعم.` }, { status: 429 })
  }

  // Generate signed URL (15 min)
  const bucket = process.env.BOOKS_BUCKET ?? 'books'
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(book.file_path, SIGNED_URL_TTL)

  if (signErr || !signed?.signedUrl) {
    console.error('[books/download] sign error', signErr)
    return NextResponse.json({ error: 'حدث خطأ، يرجى المحاولة لاحقاً' }, { status: 500 })
  }

  // Increment download count + audit log
  await supabase.from('book_purchases')
    .update({ download_count: purchase.download_count + 1 })
    .eq('id', purchase.id)

  await supabase.from('book_download_log').insert({ book_id: params.id, user_id: user.id })

  return NextResponse.json({ url: signed.signedUrl, expiresInSeconds: SIGNED_URL_TTL })
}
