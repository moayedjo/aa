import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !token || !from) return false

  const phone = to.startsWith('+') ? to : `+962${to.replace(/^0/, '')}`
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:${phone}`, Body: message }),
  })
  return res.ok
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!await rateLimit(`orders:${ip}`, 5, 60_000))
    return NextResponse.json({ error: 'طلبات كثيرة، انتظر دقيقة' }, { status: 429 })

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
        status: 'received',
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

    // Log initial status in history
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'received',
      note: 'تم استلام الطلب',
    })

    // Auto-notify customer via WhatsApp
    if (body.customerPhone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const message =
        `مرحباً ${body.customerName} 👋\n` +
        `تم استلام طلبك في JO-PRINT بنجاح!\n` +
        `رقم الطلب: ${orderNumber}\n` +
        `يمكنك متابعة طلبك من:\n${appUrl}/orders/track?q=${orderNumber}`
      const sent = await sendWhatsApp(body.customerPhone, message)

      await supabase.from('notifications').insert({
        order_id: order.id,
        type: 'confirmed',
        phone: body.customerPhone,
        message,
        sent,
      })
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

