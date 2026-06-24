import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { computeOrderPricing } from '@/lib/serverPricing'
import type { CartItemInput } from '@/lib/serverPricing'

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM
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
    const body: unknown = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }

    const b = body as Record<string, unknown>

    // ── Required field validation ─────────────────────────────────────────────
    if (typeof b.customerName !== 'string' || !b.customerName.trim())
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })

    if (typeof b.customerPhone !== 'string' || !b.customerPhone.trim())
      return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 })

    if (b.deliveryMethod !== 'pickup' && b.deliveryMethod !== 'delivery')
      return NextResponse.json({ error: 'طريقة التسليم غير صحيحة' }, { status: 400 })

    if (b.deliveryMethod === 'delivery' && (typeof b.deliveryAddress !== 'string' || !b.deliveryAddress.trim()))
      return NextResponse.json({ error: 'عنوان التوصيل مطلوب' }, { status: 400 })

    if (!Array.isArray(b.items) || b.items.length === 0)
      return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 })

    // ── Validate items structure (ignore client price entirely) ───────────────
    for (const item of b.items as unknown[]) {
      if (!item || typeof item !== 'object') {
        return NextResponse.json({ error: 'بيانات المنتج غير صالحة' }, { status: 400 })
      }
      const i = item as Record<string, unknown>
      if (typeof i.productId !== 'string' || !i.productId.trim())
        return NextResponse.json({ error: 'معرّف المنتج مطلوب' }, { status: 400 })
      if (typeof i.name !== 'string' || !i.name.trim())
        return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 })
      if (!Number.isInteger(i.quantity) || (i.quantity as number) < 1 || (i.quantity as number) > 1000)
        return NextResponse.json({ error: 'الكمية غير صحيحة' }, { status: 400 })
    }

    // ── Fetch canonical DB prices for UUID products ───────────────────────────
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const rawItems = b.items as Array<Record<string, unknown>>
    const dbProductIds = rawItems
      .map(i => i.productId as string)
      .filter(id => uuidRe.test(id))

    let dbPriceMap: Record<string, number> = {}
    if (dbProductIds.length > 0) {
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, price')
        .in('id', dbProductIds)
        .eq('active', true)
      if (pErr) throw pErr
      dbPriceMap = Object.fromEntries(
        (products ?? []).map(p => [p.id as string, Number(p.price)])
      )
    }

    // ── Build CartItemInput array (no client prices used) ────────────────────
    const cartItems: CartItemInput[] = rawItems.map(i => ({
      productId: i.productId as string,
      name:      i.name as string,
      quantity:  i.quantity as number,
      options:   (i.options as CartItemInput['options']) ?? undefined,
      pageCount: typeof i.pageCount === 'number' ? i.pageCount : undefined,
    }))

    // ── Validate coupon server-side if provided ───────────────────────────────
    let discountAmount = 0
    let couponCode: string | null = null

    if (typeof b.couponCode === 'string' && b.couponCode.trim()) {
      const { data: coupon, error: cErr } = await supabase
        .from('coupons')
        .select('id, discount_type, discount_value, minimum_order, maximum_discount, usage_limit, usage_count, starts_at, expires_at')
        .eq('code', b.couponCode.trim().toUpperCase())
        .eq('active', true)
        .single()

      if (cErr || !coupon) {
        return NextResponse.json({ error: 'رمز الخصم غير صحيح أو منتهي الصلاحية' }, { status: 400 })
      }

      // Check temporal validity
      if (coupon.starts_at && new Date(coupon.starts_at as string) > new Date()) {
        return NextResponse.json({ error: 'رمز الخصم لم يبدأ بعد' }, { status: 400 })
      }
      if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
        return NextResponse.json({ error: 'رمز الخصم منتهي الصلاحية' }, { status: 400 })
      }
      if (coupon.usage_limit !== null && (coupon.usage_count as number) >= (coupon.usage_limit as number)) {
        return NextResponse.json({ error: 'رمز الخصم استُنفد' }, { status: 400 })
      }

      // We'll pass the code to the RPC which does the atomic usage increment
      couponCode = b.couponCode.trim().toUpperCase()
    }

    // ── Server-side price computation ─────────────────────────────────────────
    let pricing
    try {
      pricing = computeOrderPricing(
        cartItems,
        dbPriceMap,
        b.deliveryMethod as 'pickup' | 'delivery',
        discountAmount,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في حساب السعر'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // ── Idempotency key ───────────────────────────────────────────────────────
    const idempotencyKey =
      typeof b.idempotencyKey === 'string' && b.idempotencyKey.trim()
        ? b.idempotencyKey.trim()
        : null

    const { data: { user } } = await supabase.auth.getUser()

    // ── Build RPC payload ─────────────────────────────────────────────────────
    const rpcPayload: Record<string, unknown> = {
      user_id:          user?.id ?? null,
      customer_name:    (b.customerName as string).trim(),
      customer_phone:   (b.customerPhone as string).trim(),
      customer_email:   typeof b.customerEmail === 'string' ? b.customerEmail.trim() : null,
      delivery_method:  b.deliveryMethod,
      delivery_address: b.deliveryMethod === 'delivery' ? (b.deliveryAddress as string).trim() : null,
      subtotal:         pricing.subtotal,
      delivery_fee:     pricing.deliveryFee,
      discount_amount:  pricing.discountAmount,
      total:            pricing.total,
      notes:            typeof b.notes === 'string' ? b.notes.trim() : null,
      idempotency_key:  idempotencyKey,
      coupon_code:      couponCode,
      items: pricing.items.map(item => ({
        product_id:   uuidRe.test(item.productId) ? item.productId : null,
        product_name: item.productName,
        quantity:     item.quantity,
        unit_price:   item.unitPrice,
        options:      item.options ?? null,
      })),
      file_ids: Array.isArray(b.fileIds) ? b.fileIds : [],
    }

    // ── Call atomic RPC ───────────────────────────────────────────────────────
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('create_order_atomic', { payload: rpcPayload })

    if (rpcError) {
      console.error('create_order_atomic error:', rpcError)
      if (rpcError.message?.includes('idempotency')) {
        return NextResponse.json({ error: 'الطلب مكرر' }, { status: 409 })
      }
      if (rpcError.message?.includes('coupon')) {
        return NextResponse.json({ error: 'رمز الخصم غير صحيح' }, { status: 400 })
      }
      throw rpcError
    }

    const result = rpcResult as { order_id: string; order_number: string; idempotent: boolean }

    // ── WhatsApp notification (non-blocking) ──────────────────────────────────
    if (b.customerPhone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const message =
        `مرحباً ${(b.customerName as string).trim()} 👋\n` +
        `تم استلام طلبك في JO-PRINT بنجاح!\n` +
        `رقم الطلب: ${result.order_number}\n` +
        `طريقة الدفع: نقداً عند الاستلام\n` +
        `المجموع: ${pricing.total.toFixed(3)} د.أ\n` +
        `يمكنك متابعة طلبك من:\n${appUrl}/orders/track?q=${result.order_number}`

      sendWhatsApp(b.customerPhone as string, message).then(sent => {
        supabase.from('notifications').insert({
          order_id: result.order_id,
          type: 'confirmed',
          phone: b.customerPhone,
          message,
          sent,
        }).then(() => {/* fire-and-forget */})
      })
    }

    return NextResponse.json({
      success:      true,
      orderId:      result.order_id,
      orderNumber:  result.order_number,
      idempotent:   result.idempotent,
      pricing: {
        subtotal:       pricing.subtotal,
        deliveryFee:    pricing.deliveryFee,
        discountAmount: pricing.discountAmount,
        total:          pricing.total,
      },
    })
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
