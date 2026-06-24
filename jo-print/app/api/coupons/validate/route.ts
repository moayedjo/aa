import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { computeCouponDiscount } from '@/lib/serverPricing'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!await rateLimit(`coupon:${ip}`, 10, 60_000))
    return NextResponse.json({ error: 'طلبات كثيرة، انتظر دقيقة' }, { status: 429 })

  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }

    const b = body as Record<string, unknown>

    if (typeof b.code !== 'string' || !b.code.trim()) {
      return NextResponse.json({ error: 'رمز الخصم مطلوب' }, { status: 400 })
    }
    if (typeof b.subtotal !== 'number' || b.subtotal < 0) {
      return NextResponse.json({ error: 'المجموع غير صحيح' }, { status: 400 })
    }

    const code = b.code.trim().toUpperCase()
    const subtotal = b.subtotal as number

    const supabase = createClient()

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, minimum_order, maximum_discount, usage_limit, usage_count, expires_at, starts_at')
      .eq('code', code)
      .eq('active', true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: 'رمز الخصم غير صحيح' }, { status: 200 })
    }

    // Temporal checks
    if (coupon.starts_at && new Date(coupon.starts_at as string) > new Date()) {
      return NextResponse.json({ valid: false, error: 'رمز الخصم لم يبدأ بعد' }, { status: 200 })
    }
    if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
      return NextResponse.json({ valid: false, error: 'رمز الخصم منتهي الصلاحية' }, { status: 200 })
    }

    // Usage limit
    if (coupon.usage_limit !== null && (coupon.usage_count as number) >= (coupon.usage_limit as number)) {
      return NextResponse.json({ valid: false, error: 'رمز الخصم استُنفد' }, { status: 200 })
    }

    const discountAmount = computeCouponDiscount(
      {
        discount_type:     coupon.discount_type as 'percentage' | 'fixed',
        discount_value:    Number(coupon.discount_value),
        minimum_order:     Number(coupon.minimum_order),
        maximum_discount:  coupon.maximum_discount !== null ? Number(coupon.maximum_discount) : null,
      },
      subtotal,
    )

    if (discountAmount === 0 && Number(coupon.minimum_order) > subtotal) {
      return NextResponse.json({
        valid: false,
        error: `الحد الأدنى للطلب لاستخدام هذا الكود هو ${Number(coupon.minimum_order).toFixed(3)} د.أ`,
      }, { status: 200 })
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountAmount,
      discountType:  coupon.discount_type,
      discountValue: Number(coupon.discount_value),
    })
  } catch (err) {
    console.error('POST /api/coupons/validate error:', err)
    return NextResponse.json({ error: 'فشل في التحقق من رمز الخصم' }, { status: 500 })
  }
}
