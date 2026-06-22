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
  const { data, error } = await supabase.from('teachers').update({
    name: body.name, subjects: body.subjects, experience: body.experience,
    rating: body.rating, rate_per_hour: body.ratePerHour,
    location: body.location, available: body.available, bio: body.bio,
  }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const { error } = await supabase.from('teachers').update({ available: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
