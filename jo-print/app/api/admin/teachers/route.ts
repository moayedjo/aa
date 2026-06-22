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
  const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  const body = await request.json()
  const { data, error } = await supabase.from('teachers').insert({
    name: body.name, subjects: body.subjects, experience: body.experience,
    rating: body.rating, rate_per_hour: body.ratePerHour,
    location: body.location, available: body.available, bio: body.bio,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
