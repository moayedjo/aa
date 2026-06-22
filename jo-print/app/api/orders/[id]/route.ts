import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .or(`id.eq.${params.id},order_number.eq.${params.id}`)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const [{ data: orderData }, { data: profile }] = await Promise.all([
      supabase.from('orders').select('user_id').eq('id', params.id).single(),
      supabase.from('profiles').select('role').eq('id', user.id).single(),
    ])
    const isAdmin = ['admin', 'order_manager'].includes(profile?.role ?? '')
    const isOwner = orderData?.user_id === user.id
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    const body = await request.json()
    const { data, error } = await supabase
      .from('orders')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error

    // Log status change in history
    await supabase.from('order_status_history').insert({
      order_id: params.id,
      status: body.status,
      note: ORDER_STATUS_LABELS[body.status] ?? body.status,
      changed_by: user.id,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'فشل في تحديث الطلب' }, { status: 500 })
  }
}

