/**
 * متطلبات إكمال الطلب لكل منتج في المتجر.
 * تُحدَّد المتطلبات بمطابقة اسم المنتج (عربي/إنجليزي) مع كلمات مفتاحية،
 * ولكل منتج: ملف تصميم (إلزامي/اختياري/بدون)، حقول نصية، وقاعدة خاصة للمج
 * (صورة أو نص — أحدهما إلزامي). حقل «تعليمات خاصة» متاح لكل المنتجات.
 */

export type FileRule = 'required' | 'optional' | 'none'

export interface TextFieldDef {
  key: string
  label: string
  placeholder: string
  required: boolean
  multiline?: boolean
}

export interface ProductRequirements {
  /** رفع ملف التصميم */
  designFile: FileRule
  /** عنوان حقل الملف (افتراضي: ملف التصميم) */
  fileLabel?: string
  /** حقول نصية إضافية */
  textFields: TextFieldDef[]
  /** المج: صورة أو نص — أحدهما يكفي */
  imageOrTextRule?: boolean
  /** ملاحظة توضيحية تظهر أعلى القسم */
  note?: string
}

interface Matcher {
  keywords: string[]
  requirements: ProductRequirements
}

const CARD_DATA_FIELD: TextFieldDef = {
  key: 'cardData',
  label: 'بيانات البطاقة',
  placeholder: 'الاسم، المسمى الوظيفي، رقم الهاتف، البريد الإلكتروني، الموقع...',
  required: true,
  multiline: true,
}

const ENGRAVE_FIELD: TextFieldDef = {
  key: 'engraveText',
  label: 'نص الإهداء / الختم',
  placeholder: 'اكتب النص المطلوب حفره أو ختمه...',
  required: true,
  multiline: true,
}

const MUG_TEXT_FIELD: TextFieldDef = {
  key: 'mugText',
  label: 'النص المطلوب طباعته',
  placeholder: 'اسم، عبارة، إهداء...',
  required: false,
  multiline: false,
}

const MATCHERS: Matcher[] = [
  {
    // المج / الكوب: صورة أو نص (أحدهما إلزامي)
    keywords: ['مج', 'كوب', 'mug', 'cup'],
    requirements: {
      designFile: 'optional',
      fileLabel: 'صورة / تصميم الطباعة',
      textFields: [MUG_TEXT_FIELD],
      imageOrTextRule: true,
      note: 'ارفع صورة أو اكتب النص المطلوب — أحدهما إلزامي على الأقل.',
    },
  },
  {
    // بطاقات العمل: بيانات إلزامية + تصميم اختياري
    keywords: ['بطاقة', 'بطاقات', 'business card', 'كرت'],
    requirements: {
      designFile: 'optional',
      fileLabel: 'ملف التصميم (اختياري إن وُجد تصميم جاهز)',
      textFields: [CARD_DATA_FIELD],
    },
  },
  {
    // الدرع والختم: نص إلزامي + شعار اختياري
    keywords: ['درع', 'ختم', 'shield', 'stamp', 'trophy', 'دروع'],
    requirements: {
      designFile: 'optional',
      fileLabel: 'الشعار (اختياري)',
      textFields: [ENGRAVE_FIELD],
    },
  },
  {
    // منتجات تتطلب ملف تصميم إلزامي
    keywords: [
      'تيشيرت', 'قميص', 'tshirt', 't-shirt', 'shirt',
      'بوستر', 'poster',
      'فلاير', 'فلايرات', 'flyer', 'flyers', 'بروشور', 'brochure',
      'بانر', 'banner', 'رول أب', 'rollup', 'لافتة',
      'ستيكر', 'ستيكرات', 'sticker', 'stickers', 'ملصق', 'ملصقات',
      'دفتر', 'دفاتر', 'notebook', 'أجندة',
    ],
    requirements: {
      designFile: 'required',
      textFields: [],
    },
  },
]

const DEFAULT_REQUIREMENTS: ProductRequirements = {
  designFile: 'optional',
  textFields: [],
}

/** يحدد متطلبات المنتج من اسمه العربي/الإنجليزي. */
export function getProductRequirements(name: string, nameEn?: string): ProductRequirements {
  const haystack = `${name} ${nameEn ?? ''}`.toLowerCase()
  for (const m of MATCHERS) {
    if (m.keywords.some(k => haystack.includes(k.toLowerCase()))) return m.requirements
  }
  return DEFAULT_REQUIREMENTS
}

export interface RequirementValues {
  fileId: string | null
  fileName: string | null
  texts: Record<string, string>
  instructions: string
}

export const EMPTY_REQUIREMENT_VALUES: RequirementValues = {
  fileId: null,
  fileName: null,
  texts: {},
  instructions: '',
}

/**
 * يتحقق من اكتمال الحقول الإلزامية.
 * يعيد null إذا كان كل شيء مكتملاً، أو رسالة عربية توضح الناقص.
 */
export function validateRequirements(
  req: ProductRequirements,
  values: RequirementValues,
): string | null {
  const hasFile = Boolean(values.fileId)

  if (req.imageOrTextRule) {
    const hasText = Object.values(values.texts).some(t => t.trim().length > 0)
    if (!hasFile && !hasText) {
      return 'يرجى رفع صورة أو كتابة النص المطلوب طباعته — أحدهما إلزامي'
    }
  } else if (req.designFile === 'required' && !hasFile) {
    return 'يرجى رفع ملف التصميم لإكمال الطلب'
  }

  for (const field of req.textFields) {
    if (field.required && !(values.texts[field.key] ?? '').trim()) {
      return `يرجى تعبئة حقل «${field.label}»`
    }
  }

  return null
}

/**
 * يحوّل قيم المتطلبات إلى options السلة (Record<string,string>).
 * المفاتيح التي تبدأ بـ "_" داخلية (مثل معرف الملف) ولا تُعرض كنص عادي.
 */
export function requirementsToOptions(
  req: ProductRequirements,
  values: RequirementValues,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of req.textFields) {
    const v = (values.texts[field.key] ?? '').trim()
    if (v) out[field.label] = v
  }
  if (values.instructions.trim()) out['تعليمات خاصة'] = values.instructions.trim()
  if (values.fileId && values.fileName) {
    out['ملف التصميم'] = values.fileName
    out['_fileId'] = values.fileId
  }
  return out
}
