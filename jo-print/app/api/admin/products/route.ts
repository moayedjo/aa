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
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: "حدث خطأ، يرجى المحاولة لاحقاً" }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 })
  if (!body.category?.trim()) return NextResponse.json({ error: 'الفئة مطلوبة' }, { status: 400 })
  if (typeof body.price !== 'number' || body.price < 0) return NextResponse.json({ error: 'السعر غير صحيح' }, { status: 400 })
  const { data, error } = await supabase.from('products').insert({
    name: body.name.trim(), name_en: body.nameEn?.trim() ?? null, category: body.category.trim(),
    price: body.price, price_unit: body.priceUnit?.trim() ?? 'لكل قطعة', description: body.description?.trim() ?? null,
    icon: body.icon ?? null, color: body.color ?? null, popular: body.popular ?? false,
    options: Array.isArray(body.options) ? body.options : [],
  }).select().single()
  if (error) return NextResponse.json({ error: "حدث خطأ، يرجى المحاولة لاحقاً" }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

