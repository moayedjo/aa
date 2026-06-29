import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const MAX_CHARS = 1500

interface QuoteResult {
  specs: {
    size?: string
    color?: string
    sides?: string
    binding?: string
    quantity?: number
    paperType?: string
  }
  estimatedPrice?: string
  missingInfo: string[]
  productionNotes: string[]
  summary: string
}

// Rule-based quotation parser — no external AI key required
function parseQuotation(description: string): QuoteResult {
  const text = description.toLowerCase()
  const missingInfo: string[] = []
  const productionNotes: string[] = []
  const specs: QuoteResult['specs'] = {}

  // Size detection
  if (text.includes('a3')) specs.size = 'A3'
  else if (text.includes('a4') || text.includes('ورقة عادية') || text.includes('a 4')) specs.size = 'A4'
  else if (text.includes('letter') || text.includes('لتر')) specs.size = 'Letter'
  else missingInfo.push('حجم الورق (A4 أو A3 أو Letter)')

  // Color detection
  if (text.includes('ملون') || text.includes('بالألوان') || text.includes('color')) specs.color = 'ملون'
  else if (text.includes('أبيض وأسود') || text.includes('أبيض واسود') || text.includes('أسود وأبيض') || text.includes('b&w') || text.includes('bw') || text.includes('أبيض')) specs.color = 'أبيض وأسود'
  else missingInfo.push('نوع الطباعة (ملون أم أبيض وأسود)')

  // Sides
  if (text.includes('وجهين') || text.includes('وجه وظهر') || text.includes('double') || text.includes('وجهان')) specs.sides = 'وجهين'
  else if (text.includes('وجه واحد') || text.includes('single') || text.includes('من وجه')) specs.sides = 'وجه واحد'

  // Binding
  if (text.includes('سبيرال') || text.includes('حلزون')) specs.binding = 'سبيرال'
  else if (text.includes('تدبيس') || text.includes('دبابيس')) specs.binding = 'تدبيس'
  else if (text.includes('مجلد') || text.includes('تجليد فاخر') || text.includes('hardcover')) specs.binding = 'تجليد فاخر'

  // Quantity
  const qtyMatch = text.match(/(\d+)\s*(نسخ|نسخة|قطع|قطعة|كتيب|كتيبات|كوبي|copies|copy)/)
  if (qtyMatch) specs.quantity = parseInt(qtyMatch[1])
  else missingInfo.push('الكمية المطلوبة (عدد النسخ)')

  // Paper type
  if (text.includes('لامع') || text.includes('غلوسي') || text.includes('glossy')) specs.paperType = 'لامع'
  else if (text.includes('مطفي') || text.includes('مات') || text.includes('matte')) specs.paperType = 'مطفي'

  // Production notes
  if (text.includes('pdf') || text.includes('بي دي اف')) productionNotes.push('يُرجى إرفاق ملف PDF بدقة 300 DPI على الأقل.')
  if (text.includes('صورة') || text.includes('صور') || text.includes('فوتو')) productionNotes.push('الصور تحتاج دقة لا تقل عن 300 DPI للطباعة الاحترافية.')
  if (specs.binding === 'تجليد فاخر') productionNotes.push('التجليد الفاخر يحتاج وقت إنتاج إضافي 1-2 أيام عمل.')
  if (specs.size === 'A3') productionNotes.push('طباعة A3 تتضاعف في التكلفة مقارنةً بـ A4.')
  if ((specs.quantity ?? 0) > 100) productionNotes.push('الكميات الكبيرة تستفيد من أسعار الجملة — تواصل معنا للحصول على عرض خاص.')

  // Build summary
  const specParts = [
    specs.size,
    specs.color,
    specs.sides,
    specs.binding,
    specs.quantity ? `${specs.quantity} نسخة` : null,
    specs.paperType,
  ].filter(Boolean)

  const summary = specParts.length > 0
    ? `ملخص طلبك: ${specParts.join('، ')}.`
    : 'لم يتمكن النظام من استخلاص تفاصيل كافية من وصفك.'

  return { specs, missingInfo, productionNotes, summary }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const allowed = await rateLimit(`ai-quote:${ip}`, 10, 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'لقد تجاوزت الحد المسموح به. يرجى الانتظار قليلاً.' },
      { status: 429 }
    )
  }

  let body: { description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 })
  }

  const description = (body.description ?? '').trim()
  if (!description) return NextResponse.json({ error: 'يرجى إدخال وصف الطلب.' }, { status: 400 })
  if (description.length > MAX_CHARS) {
    return NextResponse.json({ error: `الوصف طويل جداً (الحد الأقصى ${MAX_CHARS} حرف).` }, { status: 400 })
  }

  const result = parseQuotation(description)
  return NextResponse.json(result)
}
