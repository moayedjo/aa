import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) return NextResponse.json({ error: 'فشل في جلب بيانات الملف الشخصي' }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const body = await request.json()
    if (!body.fullName?.trim()) return NextResponse.json({ error: 'الاسم الكامل مطلوب' }, { status: 400 })
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: body.fullName.trim(), phone: body.phone?.trim() ?? null, address: body.address?.trim() ?? null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'فشل في تحديث الملف الشخصي' }, { status: 500 })
  }
}
