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
  const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'اسم المعلم مطلوب' }, { status: 400 })
  if (!Array.isArray(body.subjects) || body.subjects.length === 0) return NextResponse.json({ error: 'المواد مطلوبة' }, { status: 400 })
  if (!body.location?.trim()) return NextResponse.json({ error: 'الموقع مطلوب' }, { status: 400 })
  if (typeof body.ratePerHour !== 'number' || body.ratePerHour < 0) return NextResponse.json({ error: 'السعر غير صحيح' }, { status: 400 })
  const { data, error } = await supabase.from('teachers').insert({
    name: body.name.trim(), subjects: body.subjects, experience: body.experience ?? 0,
    rating: body.rating ?? 5.0, rate_per_hour: body.ratePerHour,
    location: body.location.trim(), available: body.available ?? true, bio: body.bio?.trim() ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

