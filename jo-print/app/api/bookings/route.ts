import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!await rateLimit(`bookings:${ip}`, 5, 60_000))
    return NextResponse.json({ error: 'طلبات كثيرة، انتظر دقيقة' }, { status: 429 })

  try {
    const body = await request.json()
    const { teacherId, teacherName, name, phone, subject, preferredTime, notes } = body

    if (!name?.trim() || !phone?.trim() || !teacherId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Store booking with personal data securely server-side
    await supabase.from('teacher_bookings').insert({
      teacher_id: teacherId,
      teacher_name: teacherName,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      subject: subject ?? null,
      preferred_time: preferredTime ?? null,
      notes: notes ?? null,
      user_id: user?.id ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/bookings error:', error)
    // Non-critical — WhatsApp still opens on client side
    return NextResponse.json({ success: true })
  }
}
