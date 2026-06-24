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

    // Validate required fields
    if (!body.customerName?.trim()) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    if (!body.customerPhone?.trim()) return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 })
    if (!['pickup', 'delivery'].includes(body.deliveryMethod)) return NextResponse.json({ error: 'طريقة التسليم غير صحيحة' }, { status: 400 })
    if (body.deliveryMethod === 'delivery' && !body.deliveryAddress?.trim()) return NextResponse.json({ error: 'عنوان التوصيل مطلوب' }, { status: 400 })
    if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 })

    // Validate items structure
    for (const item of body.items) {
      if (!item.productId || !item.name) return NextResponse.json({ error: 'بيانات المنتج غير مكتملة' }, { status: 400 })
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) return NextResponse.json({ error: 'الكمية غير صحيحة' }, { status: 400 })
      if (typeof item.price !== 'number' || item.price < 0 || item.price > 10000) return NextResponse.json({ error: 'السعر غير صحيح' }, { status: 400 })
    }

    // Verify prices server-side for standard DB products (productId is a UUID)
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const dbProductIds = body.items
      .map((i: { productId: string }) => i.productId)
      .filter((id: string) => uuidRe.test(id))

    let priceMap: Record<string, number> = {}
    if (dbProductIds.length > 0) {
      const { data: products, error: pErr } = await supabase
        .from('products').select('id, price').in('id', dbProductIds)
      if (pErr) throw pErr
      priceMap = Object.fromEntries((products ?? []).map(p => [p.id, Number(p.price)]))
    }

    // Build verified items, using canonical DB price for products, client price for custom (print files etc.)
    type RawItem = { productId: string; name: string; quantity: number; price: number; options?: Record<string, string> }
    const verifiedItems = body.items.map((item: RawItem) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: priceMap[item.productId] ?? item.price,
      options: item.options,
    }))

    const computedSubtotal = verifiedItems.reduce((sum: number, i: RawItem) => sum + i.price * i.quantity, 0)
    const deliveryFee = body.deliveryMethod === 'delivery' ? 2.0 : 0
    const computedTotal = Math.round((computedSubtotal + deliveryFee) * 1000) / 1000

    const { data: { user } } = await supabase.auth.getUser()

    const orderNumber = `JP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`

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
        subtotal: computedSubtotal,
        delivery_fee: deliveryFee,
        total: computedTotal,
        notes: body.notes ?? null,
        status: 'received',
      })
      .select()
      .single()

    if (orderError) throw orderError

    if (verifiedItems.length > 0) {
      const items = verifiedItems.map((item: RawItem) => ({
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

