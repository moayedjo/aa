import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const allowed = await rateLimit(`register-shop:${ip}`, 3, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'لقد تجاوزت الحد المسموح به. يرجى المحاولة لاحقاً.' },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'طلب غير صالح.' },
      { status: 400 }
    )
  }

  const {
    shopName,
    area,
    address,
    phone,
    email,
    ownerName,
    services,
    hours,
    description,
  } = body as {
    shopName?: string
    area?: string
    address?: string
    phone?: string
    email?: string
    ownerName?: string
    services?: unknown
    hours?: string
    description?: string
  }

  const requiredFields: [string, unknown, string][] = [
    ['shopName', shopName, 'اسم المحل'],
    ['area', area, 'المنطقة'],
    ['address', address, 'العنوان'],
    ['phone', phone, 'رقم الهاتف'],
    ['email', email, 'البريد الإلكتروني'],
    ['ownerName', ownerName, 'اسم المالك'],
  ]

  for (const [, value, label] of requiredFields) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return NextResponse.json(
        { success: false, message: `الحقل مطلوب: ${label}` },
        { status: 400 }
      )
    }
  }

  const supabase = createClient()

  const { error } = await supabase.from('print_shops').insert({
    name: (shopName as string).trim(),
    area: (area as string).trim(),
    address: (address as string).trim(),
    phone: (phone as string).trim(),
    email: (email as string).trim(),
    owner_name: (ownerName as string).trim(),
    services: Array.isArray(services) ? services : [],
    hours: hours?.trim() ?? null,
    notes: description?.trim() ?? null,
    status: 'pending',
    rating: 5.0,
    active: false,
  })

  if (error) {
    console.error('Error inserting print shop registration:', error)
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { success: true, message: 'تم استلام طلبك بنجاح' },
    { status: 201 }
  )
}
