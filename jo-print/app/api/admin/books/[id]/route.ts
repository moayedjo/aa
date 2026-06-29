import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const body = await request.json()
  const { data, error } = await supabase.from('books').update({
    title: body.title, subject: body.subject, grade: body.grade,
    price: body.price, pages: body.pages, description: body.description,
  }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: "حدث خطأ، يرجى المحاولة لاحقاً" }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const { error } = await supabase.from('books').update({ active: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: "حدث خطأ، يرجى المحاولة لاحقاً" }, { status: 500 })
  return NextResponse.json({ success: true })
}
