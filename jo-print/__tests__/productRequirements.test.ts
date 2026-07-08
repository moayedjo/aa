import { describe, it, expect } from 'vitest'
import {
  getProductRequirements, validateRequirements, requirementsToOptions,
  EMPTY_REQUIREMENT_VALUES, type RequirementValues,
} from '@/lib/productRequirements'

const vals = (over: Partial<RequirementValues> = {}): RequirementValues => ({
  ...EMPTY_REQUIREMENT_VALUES, texts: {}, ...over,
})

describe('getProductRequirements — تحديد متطلبات كل منتج', () => {
  it('المج: صورة أو نص (أحدهما إلزامي)', () => {
    const r = getProductRequirements('مج مطبوع', 'Custom Mug')
    expect(r.imageOrTextRule).toBe(true)
    expect(r.designFile).toBe('optional')
  })

  it('التيشيرت/البوستر/الفلايرات/البانر/الستيكرات/الدفتر: ملف تصميم إلزامي', () => {
    for (const [ar, en] of [
      ['تيشيرت مطبوع', 'T-Shirt'], ['بوستر A2', 'Poster'], ['فلايرات دعائية', 'Flyers'],
      ['بانر رول أب', 'Banner'], ['ستيكرات لاصقة', 'Stickers'], ['دفتر ملاحظات', 'Notebook'],
    ]) {
      const r = getProductRequirements(ar, en)
      expect(r.designFile, `${ar} يجب أن يتطلب ملفاً`).toBe('required')
    }
  })

  it('بطاقات العمل: بيانات إلزامية + ملف اختياري', () => {
    const r = getProductRequirements('بطاقات عمل', 'Business Cards')
    expect(r.designFile).toBe('optional')
    expect(r.textFields.some(f => f.key === 'cardData' && f.required)).toBe(true)
  })

  it('الدرع والختم: نص إلزامي + شعار اختياري', () => {
    for (const name of ['درع تكريم', 'ختم رسمي']) {
      const r = getProductRequirements(name)
      expect(r.designFile).toBe('optional')
      expect(r.textFields.some(f => f.key === 'engraveText' && f.required)).toBe(true)
    }
  })

  it('منتج غير معروف: كل شيء اختياري', () => {
    const r = getProductRequirements('منتج آخر', 'Other')
    expect(r.designFile).toBe('optional')
    expect(r.textFields).toHaveLength(0)
  })
})

describe('validateRequirements — منع الإضافة قبل الاكتمال', () => {
  const mug = getProductRequirements('مج', 'Mug')
  const tshirt = getProductRequirements('تيشيرت', 'T-Shirt')
  const cards = getProductRequirements('بطاقات عمل', 'Business Cards')
  const shield = getProductRequirements('درع', 'Shield')

  it('المج بدون صورة ولا نص → رسالة خطأ', () => {
    expect(validateRequirements(mug, vals())).toContain('أحدهما إلزامي')
  })

  it('المج بنص فقط → صالح', () => {
    expect(validateRequirements(mug, vals({ texts: { mugText: 'إهداء' } }))).toBeNull()
  })

  it('المج بصورة فقط → صالح', () => {
    expect(validateRequirements(mug, vals({ fileId: 'f1', fileName: 'a.png' }))).toBeNull()
  })

  it('التيشيرت بدون ملف → رسالة خطأ', () => {
    expect(validateRequirements(tshirt, vals())).toContain('ملف التصميم')
  })

  it('التيشيرت مع ملف → صالح', () => {
    expect(validateRequirements(tshirt, vals({ fileId: 'f1', fileName: 'd.pdf' }))).toBeNull()
  })

  it('بطاقات العمل بدون بيانات → رسالة خطأ باسم الحقل', () => {
    expect(validateRequirements(cards, vals())).toContain('بيانات البطاقة')
  })

  it('الدرع بدون نص → خطأ؛ مع نص → صالح (الشعار اختياري)', () => {
    expect(validateRequirements(shield, vals())).toContain('نص الإهداء')
    expect(validateRequirements(shield, vals({ texts: { engraveText: 'تكريم' } }))).toBeNull()
  })
})

describe('requirementsToOptions — تفاصيل السلة', () => {
  it('يضمّن النصوص والتعليمات واسم الملف ومعرفه الداخلي', () => {
    const cards = getProductRequirements('بطاقات عمل', 'Business Cards')
    const out = requirementsToOptions(cards, vals({
      texts: { cardData: 'أحمد — مدير' },
      instructions: 'خلفية زرقاء',
      fileId: 'file-123', fileName: 'design.pdf',
    }))
    expect(out['بيانات البطاقة']).toBe('أحمد — مدير')
    expect(out['تعليمات خاصة']).toBe('خلفية زرقاء')
    expect(out['ملف التصميم']).toBe('design.pdf')
    expect(out['_fileId']).toBe('file-123')
  })

  it('يتجاهل الحقول الفارغة', () => {
    const mug = getProductRequirements('مج', 'Mug')
    const out = requirementsToOptions(mug, vals({ texts: { mugText: '  ' } }))
    expect(Object.keys(out)).toHaveLength(0)
  })
})
