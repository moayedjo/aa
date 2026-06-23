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
  const { data, error } = await supabase.from('print_shops').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'اسم المحل مطلوب' }, { status: 400 })
  if (!body.address?.trim()) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 })
  if (!body.area?.trim()) return NextResponse.json({ error: 'المنطقة مطلوبة' }, { status: 400 })
  if (!body.phone?.trim()) return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 })
  const { data, error } = await supabase.from('print_shops').insert({
    name: body.name.trim(), address: body.address.trim(), area: body.area.trim(),
    phone: body.phone.trim(), hours: body.hours?.trim() ?? null,
    rating: body.rating ?? 5.0, services: Array.isArray(body.services) ? body.services : [],
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

