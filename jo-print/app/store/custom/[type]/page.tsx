'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Upload, X, FileImage, ShoppingCart, Check, AlertCircle } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { formatPrice } from '@/lib/pricing'

// ── Product definitions ──────────────────────────────────────────────────────

type CustomType = 'mug' | 'poster' | 'shield' | 'tshirt'

interface SizeOption { label: string; price: number }

interface ProductDef {
  name: string
  icon: string
  basePrice: number
  description: string
  allowName: boolean
  allowPhoto: boolean
  sizes?: SizeOption[]
  tshirtSizes?: string[]
  shieldLines?: number
  nameLabel?: string
  namePlaceholder?: string
}

const PRODUCTS: Record<CustomType, ProductDef> = {
  mug: {
    name: 'طباعة على مج',
    icon: '☕',
    basePrice: 5,
    description: 'طباعة اسمك أو صورتك على مج سيراميك عالي الجودة — هدية مميزة لكل مناسبة.',
    allowName: true,
    allowPhoto: true,
    nameLabel: 'الاسم أو النص على المج',
    namePlaceholder: 'مثال: محمد 🎉 أو عيد ميلاد سعيد',
  },
  poster: {
    name: 'بوستر مخصص',
    icon: '🖼️',
    basePrice: 3,
    description: 'ارفع تصميمك واختر الحجم — طباعة فاخرة بألوان نابضة على ورق عالي الجودة.',
    allowName: false,
    allowPhoto: true,
    sizes: [
      { label: 'A4', price: 3 },
      { label: 'A3', price: 5 },
      { label: 'A2', price: 8 },
      { label: 'A1', price: 12 },
    ],
  },
  shield: {
    name: 'درع تذكاري',
    icon: '🏆',
    basePrice: 15,
    description: 'دروع تذكارية مخصصة للمؤسسات والتكريم. يمكن إضافة اسم وشعار ونص.',
    allowName: true,
    allowPhoto: true,
    nameLabel: 'اسم المُكرَّم أو المؤسسة',
    namePlaceholder: 'مثال: المهندس أحمد العمري',
    shieldLines: 3,
  },
  tshirt: {
    name: 'طباعة على تيشيرت',
    icon: '👕',
    basePrice: 8,
    description: 'طباعة اسمك أو تصميمك على تيشيرت قطني 100% — ألوان ثابتة وجودة عالية.',
    allowName: true,
    allowPhoto: true,
    nameLabel: 'النص أو الاسم على التيشيرت',
    namePlaceholder: 'مثال: Team Jordan 2025',
    tshirtSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
}

const TSHIRT_COLORS = ['أبيض', 'أسود', 'رمادي', 'كحلي', 'أحمر']
const MAX_PHOTO = 20 * 1024 * 1024 // 20 MB

// ── Component ────────────────────────────────────────────────────────────────

export default function CustomProductPage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as CustomType
  const product = PRODUCTS[type]

  const [customMode, setCustomMode] = useState<'name' | 'photo'>('name')
  const [nameText, setNameText] = useState('')
  const [extraLines, setExtraLines] = useState(['', ''])
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0]?.label ?? '')
  const [tshirtSize, setTshirtSize] = useState('M')
  const [tshirtColor, setTshirtColor] = useState('أبيض')
  const [quantity, setQuantity] = useState(1)

  // photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [added, setAdded] = useState(false)
  const [addError, setAddError] = useState('')

  if (!product) {
    router.replace('/store')
    return null
  }

  // Computed price
  const sizePrice = product.sizes?.find(s => s.label === selectedSize)?.price ?? product.basePrice
  const totalPrice = sizePrice * quantity

  // Photo handling
  const handlePhotoSelect = (file: File) => {
    if (file.size > MAX_PHOTO) {
      setPhotoError(`حجم الصورة يتجاوز 20 ميغابايت`)
      return
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError('يُرجى اختيار ملف صورة (JPG, PNG, ...)')
      return
    }
    setPhotoError('')
    setPhotoFile(file)
    setUploadedFileId(null)
    const reader = new FileReader()
    reader.onload = e => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null
    if (uploadedFileId) return uploadedFileId
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', photoFile)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'فشل رفع الصورة')
      setUploadedFileId(data.fileId)
      return data.fileId as string
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'فشل رفع الصورة')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleAddToCart = async () => {
    setAddError('')
    if (customMode === 'name' && product.allowName && !nameText.trim()) {
      setAddError('يرجى إدخال الاسم أو النص المطلوب')
      return
    }
    if (customMode === 'photo' && product.allowPhoto && !photoFile) {
      setAddError('يرجى رفع الصورة المطلوبة')
      return
    }

    let fileId: string | null = null
    if (customMode === 'photo' && photoFile) {
      fileId = await handleUploadPhoto()
      if (!fileId) return
    }

    const options: Record<string, string> = {}
    if (customMode === 'name') {
      options['النص'] = nameText.trim()
      if (product.shieldLines) {
        if (extraLines[0]) options['السطر الثاني'] = extraLines[0]
        if (extraLines[1]) options['السطر الثالث'] = extraLines[1]
      }
    } else {
      options['الصورة'] = fileId ? `file:${fileId}` : 'مرفوعة'
    }
    if (selectedSize) options['الحجم'] = selectedSize
    if (product.tshirtSizes) {
      options['المقاس'] = tshirtSize
      options['اللون'] = tshirtColor
    }

    addToCart({
      productId: `custom-${type}-${Date.now()}`,
      name: product.name,
      price: sizePrice,
      quantity,
      type: 'product',
      options,
    })
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
  }

  return (
    <div className="py-10 px-4 bg-surface min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-8">
          <Link href="/store" className="hover:text-primary">المتجر</Link>
          <ChevronRight size={14} className="rotate-180" />
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        {added ? (
          /* ── Success state ── */
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تمت الإضافة للسلة!</h2>
            <p className="text-gray-500 mb-6">تمت إضافة {product.name} إلى سلة التسوق</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setAdded(false); setNameText(''); setPhotoFile(null); setPhotoPreview(null); setUploadedFileId(null) }}
                className="border border-border px-5 py-3 rounded-xl font-medium text-gray-700 hover:bg-surface">
                طلب آخر
              </button>
              <a href="/cart" className="bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700">
                إتمام الشراء
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left: product preview */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-border aspect-square flex flex-col items-center justify-center gap-3 overflow-hidden">
                {customMode === 'photo' && photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-contain p-6" />
                ) : (
                  <>
                    <div className="text-8xl">{product.icon}</div>
                    {customMode === 'name' && nameText && (
                      <div className="text-center px-6">
                        <p className="font-bold text-xl text-gray-800 break-words">{nameText}</p>
                        {product.shieldLines && extraLines[0] && <p className="text-gray-600 mt-1">{extraLines[0]}</p>}
                        {product.shieldLines && extraLines[1] && <p className="text-gray-500 mt-0.5 text-sm">{extraLines[1]}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-border p-4">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
                <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>
              </div>
            </div>

            {/* Right: options */}
            <div className="space-y-5">

              {/* Price */}
              <div className="bg-white rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                <span className="text-gray-600 text-sm">السعر</span>
                <div className="text-left">
                  <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  {quantity > 1 && <span className="text-xs text-gray-400 block">{formatPrice(sizePrice)} × {quantity}</span>}
                </div>
              </div>

              {/* Size selector (poster) */}
              {product.sizes && (
                <div className="bg-white rounded-2xl border border-border p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">الحجم</p>
                  <div className="grid grid-cols-4 gap-2">
                    {product.sizes.map(s => (
                      <button key={s.label} type="button" onClick={() => setSelectedSize(s.label)}
                        className={`py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                          selectedSize === s.label ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700'
                        }`}>
                        <div>{s.label}</div>
                        <div className="text-xs font-normal">{formatPrice(s.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* T-shirt options */}
              {product.tshirtSizes && (
                <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">المقاس</p>
                    <div className="flex flex-wrap gap-2">
                      {product.tshirtSizes.map(s => (
                        <button key={s} type="button" onClick={() => setTshirtSize(s)}
                          className={`w-12 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                            tshirtSize === s ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">لون التيشيرت</p>
                    <div className="flex flex-wrap gap-2">
                      {TSHIRT_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setTshirtColor(c)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors ${
                            tshirtColor === c ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-gray-200 text-gray-700'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Customization: name or photo */}
              <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
                {product.allowName && product.allowPhoto && (
                  <div className="flex rounded-xl overflow-hidden border border-gray-200">
                    <button type="button" onClick={() => setCustomMode('name')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${customMode === 'name' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      ✏️ كتابة نص / اسم
                    </button>
                    <button type="button" onClick={() => setCustomMode('photo')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${customMode === 'photo' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      🖼️ رفع صورة
                    </button>
                  </div>
                )}

                {/* Name mode */}
                {customMode === 'name' && product.allowName && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{product.nameLabel ?? 'الاسم أو النص'}</label>
                    <input
                      value={nameText}
                      onChange={e => setNameText(e.target.value.slice(0, 60))}
                      placeholder={product.namePlaceholder ?? 'أدخل النص هنا'}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 text-left">{nameText.length}/60</p>
                    {product.shieldLines && (
                      <>
                        <input value={extraLines[0]} onChange={e => setExtraLines(l => [e.target.value, l[1]])}
                          placeholder="السطر الثاني (اختياري) — المسمى أو الجهة"
                          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                        <input value={extraLines[1]} onChange={e => setExtraLines(l => [l[0], e.target.value])}
                          placeholder="السطر الثالث (اختياري) — التاريخ أو العام"
                          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                      </>
                    )}
                  </div>
                )}

                {/* Photo mode */}
                {customMode === 'photo' && product.allowPhoto && (
                  <div>
                    {!photoFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f) }}
                        onDragOver={e => e.preventDefault()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">اسحب الصورة هنا أو اضغط للاختيار</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG — حد أقصى 20 ميغابايت</p>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f) }} />
                      </div>
                    ) : (
                      <div className="border border-green-200 bg-green-50 rounded-xl p-3 flex items-center gap-3">
                        <FileImage size={20} className="text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{photoFile.name}</p>
                          <p className="text-xs text-gray-500">{(photoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); setUploadedFileId(null) }}
                          className="text-gray-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    {photoError && (
                      <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />{photoError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="bg-white rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">الكمية</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 border border-gray-200 rounded-xl text-lg hover:border-primary">−</button>
                  <span className="w-8 text-center font-bold">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 border border-gray-200 rounded-xl text-lg hover:border-primary">+</button>
                </div>
              </div>

              {/* Error */}
              {addError && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm">
                  <AlertCircle size={14} />{addError}
                </div>
              )}

              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                disabled={uploading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {uploading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />جاري رفع الصورة...</>
                  : <><ShoppingCart size={18} />إضافة للسلة</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
