import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Send WhatsApp/SMS notification via Twilio
// Requires env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM // e.g. whatsapp:+14155238886

  if (!sid || !token || !from) return false

  const phone = to.startsWith('+') ? to : `+962${to.replace(/^0/, '')}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: from,
      To: `whatsapp:${phone}`,
      Body: message,
    }),
  })

  return res.ok
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only admins can trigger manual notifications
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single()
    if (!profile || !['admin', 'order_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { orderId, type } = await request.json()

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    let message = ''
    if (type === 'confirmed') {
      message = `مرحباً ${order.customer_name} 👋\nتم استلام طلبك في JO-PRINT بنجاح!\nرقم الطلب: ${order.order_number}\nيمكنك متابعة طلبك من: ${process.env.NEXT_PUBLIC_APP_URL}/orders/track?q=${order.order_number}`
    } else if (type === 'ready') {
      message = `مرحباً ${order.customer_name} 🎉\nطلبك رقم ${order.order_number} جاهز للاستلام!\nالعنوان: عمان، الأردن`
    } else if (type === 'shipped') {
      message = `مرحباً ${order.customer_name} 🚚\nطلبك رقم ${order.order_number} في طريقه إليك!\nوقت التوصيل المتوقع: 24-48 ساعة`
    } else if (type === 'status_update') {
      message = `مرحباً ${order.customer_name}\nتم تحديث حالة طلبك رقم ${order.order_number}\nتابع طلبك: ${process.env.NEXT_PUBLIC_APP_URL}/orders/track?q=${order.order_number}`
    } else {
      return NextResponse.json({ error: 'نوع الإشعار غير صحيح' }, { status: 400 })
    }

    const sent = await sendWhatsApp(order.customer_phone, message)

    // Log notification in DB
    await supabase.from('notifications').insert({
      order_id: orderId,
      type,
      phone: order.customer_phone,
      message,
      sent,
    }).select()

    return NextResponse.json({ success: true, sent })
  } catch (error) {
    console.error('POST /api/notify error:', error)
    return NextResponse.json({ error: 'فشل في إرسال الإشعار' }, { status: 500 })
  }
}
