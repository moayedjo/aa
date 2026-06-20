import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { data: { user } } = await supabase.auth.getUser()

    const orderNumber = `JP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user?.id ?? null,
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        customer_email: body.customerEmail ?? null,
        delivery_method: body.deliveryMethod,
        delivery_address: body.deliveryAddress ?? null,
        payment_method: body.paymentMethod,
        subtotal: body.subtotal,
        delivery_fee: body.deliveryFee,
        total: body.total,
        notes: body.notes ?? null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    if (body.items?.length > 0) {
      const items = body.items.map((item: { productId: string; name: string; quantity: number; price: number; options?: Record<string, string> }) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        options: item.options ?? null,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) throw itemsError
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'فشل في إنشاء الطلب' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'فشل في جلب الطلبات' }, { status: 500 })
  }
}
