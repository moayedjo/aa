import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

const MAX_SIZE = 50 * 1024 * 1024

/** Validate that the file's magic bytes match the declared MIME type. */
function validateMagicBytes(bytes: ArrayBuffer, mimeType: string): boolean {
  const buf = new Uint8Array(bytes)

  switch (mimeType) {
    case 'application/pdf':
      // %PDF = 25 50 44 46
      return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46

    case 'image/png':
      // 89 50 4E 47 0D 0A 1A 0A
      return (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
      )

    case 'image/jpeg':
      // FF D8 FF
      return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF

    case 'application/msword':
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.ms-excel':
      // OLE Compound Document: D0 CF 11 E0
      return buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      // ZIP (OOXML): 50 4B 03 04
      return buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04

    default:
      return false
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!await rateLimit(`upload:${ip}`, 10, 60_000))
    return NextResponse.json({ error: 'طلبات كثيرة، انتظر دقيقة' }, { status: 429 })

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const printOptionsRaw = formData.get('printOptions') as string | null

    if (!file) return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 })

    // Block executables / scripts before further checks (defense in depth)
    if (
      file.type.includes('executable') ||
      file.type.includes('script') ||
      file.type.includes('x-sh') ||
      file.type.includes('x-bash')
    ) {
      return NextResponse.json({ error: 'نوع الملف غير مسموح به' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. الأنواع المدعومة: PDF, DOC, DOCX, JPG, PNG, PPT, PPTX' }, { status: 400 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'حجم الملف يتجاوز الحد المسموح (50MB)' }, { status: 400 })

    const bytes = await file.arrayBuffer()

    // Magic bytes validation
    if (!validateMagicBytes(bytes, file.type)) {
      return NextResponse.json({ error: 'محتوى الملف لا يطابق النوع المُعلن' }, { status: 400 })
    }

    // UUID filename — use canonical extension from MIME type, not user-supplied
    const canonicalExt = MIME_TO_EXT[file.type] ?? 'bin'
    const userId = user?.id ?? 'guest'
    const path = `${userId}/${crypto.randomUUID()}.${canonicalExt}`

    let pageCount: number | null = null
    if (file.type === 'application/pdf') {
      try {
        const buf = Buffer.from(bytes)
        // Try /Count in page tree first (reliable for most PDFs)
        const countMatch = buf.toString('latin1').match(/\/Count\s+(\d+)/)
        if (countMatch) {
          pageCount = parseInt(countMatch[1], 10) || null
        } else {
          // Fallback: count /Type /Page entries (works for uncompressed PDFs)
          const text = buf.toString('binary')
          const matches = text.match(/\/Type\s*\/Page[^s]/g)
          pageCount = matches ? matches.length : null
        }
      } catch { pageCount = null }
    }

    const { error: uploadError } = await supabase.storage
      .from('print-files')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'فشل في رفع الملف إلى التخزين' }, { status: 500 })
    }

    const { data: record, error: dbError } = await supabase
      .from('print_files')
      .insert({
        user_id: user?.id ?? null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.type,
        print_options: printOptionsRaw ? (() => { try { return JSON.parse(printOptionsRaw) } catch { return null } })() : null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ success: true, fileId: record.id, path, pageCount })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json({ error: 'فشل في رفع الملف' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) return NextResponse.json({ error: 'معرّف الملف مطلوب' }, { status: 400 })

    // Ownership check: verify file belongs to requesting user
    const { data: fileRecord, error: fetchError } = await supabase
      .from('print_files')
      .select('id, file_path, user_id')
      .eq('id', fileId)
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 })
    }

    if (fileRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح بالوصول لهذا الملف' }, { status: 403 })
    }

    const { data: signedUrl, error: signError } = await supabase.storage
      .from('print-files')
      .createSignedUrl(fileRecord.file_path as string, 60 * 60) // 1 hour

    if (signError || !signedUrl) {
      return NextResponse.json({ error: 'فشل في إنشاء رابط الملف' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrl.signedUrl })
  } catch (error) {
    console.error('GET /api/upload error:', error)
    return NextResponse.json({ error: 'فشل في جلب الملف' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }
    const b = body as Record<string, unknown>
    const fileId = b.fileId as string | undefined
    const orderId = b.orderId as string | undefined

    if (!fileId || !orderId) {
      return NextResponse.json({ error: 'معرّف الملف والطلب مطلوبان' }, { status: 400 })
    }

    // Ownership check
    const { data: fileRecord, error: fetchError } = await supabase
      .from('print_files')
      .select('id, user_id, order_id')
      .eq('id', fileId)
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 })
    }

    if (fileRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح بالوصول لهذا الملف' }, { status: 403 })
    }

    // Prevent reuse: file must not already be linked to an order
    if (fileRecord.order_id !== null) {
      return NextResponse.json({ error: 'الملف مرتبط بطلب آخر بالفعل' }, { status: 409 })
    }

    const { error: updateError } = await supabase
      .from('print_files')
      .update({ order_id: orderId })
      .eq('id', fileId)
      .is('order_id', null) // extra safety: only update if still unlinked

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/upload error:', error)
    return NextResponse.json({ error: 'فشل في ربط الملف بالطلب' }, { status: 500 })
  }
}
