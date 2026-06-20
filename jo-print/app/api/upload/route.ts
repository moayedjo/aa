import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
const MAX_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const printOptionsRaw = formData.get('printOptions') as string | null

    if (!file) return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. الأنواع المدعومة: PDF, DOC, DOCX, JPG, PNG, PPT, PPTX' }, { status: 400 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'حجم الملف يتجاوز الحد المسموح (50MB)' }, { status: 400 })

    const ext = file.name.split('.').pop() ?? 'bin'
    const userId = user?.id ?? 'guest'
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const bytes = await file.arrayBuffer()
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
        print_options: printOptionsRaw ? JSON.parse(printOptionsRaw) : null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ success: true, fileId: record.id, path })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json({ error: 'فشل في رفع الملف' }, { status: 500 })
  }
}
