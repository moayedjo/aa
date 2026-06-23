import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

export async function GET() {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'عنوان الكتاب مطلوب' }, { status: 400 })
  if (!body.subject?.trim()) return NextResponse.json({ error: 'المادة مطلوبة' }, { status: 400 })
  if (!body.grade?.trim()) return NextResponse.json({ error: 'الصف مطلوب' }, { status: 400 })
  if (typeof body.price !== 'number' || body.price < 0) return NextResponse.json({ error: 'السعر غير صحيح' }, { status: 400 })
  const { data, error } = await supabase.from('books').insert({
    title: body.title.trim(), subject: body.subject.trim(), grade: body.grade.trim(),
    price: body.price, pages: body.pages ?? null, description: body.description?.trim() ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

