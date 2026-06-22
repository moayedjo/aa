'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UploadZone from '@/components/printing/UploadZone'
import PrintOptionsForm from '@/components/printing/PrintOptions'
import type { PrintOptions } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'
import { addToCart } from '@/lib/cart'

const steps = ['رفع الملف', 'خيارات الطباعة', 'مراجعة', 'تأكيد']

function calcPrintPrice(opts: PrintOptions, pages: number): number {
  let pricePerPage = opts.color === 'color' ? 0.15 : 0.05
  if (opts.paperType === 'glossy') pricePerPage += 0.05
  if (opts.paperType === 'matte') pricePerPage += 0.03
  const sides = opts.sides === 'double' ? Math.ceil(pages / 2) : pages
  return pricePerPage * sides * opts.copies
}

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [opts, setOpts] = useState<PrintOptions>({
    size: 'A4', color: 'blackwhite', sides: 'single',
    paperType: 'standard', quantity: 1, copies: 1,
  })
  const estimatedPages = 10
  const price = calcPrintPrice(opts, estimatedPages)

  const handleUploadFile = async () => {
    if (!file) return
    setUploading(true); setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('printOptions', JSON.stringify(opts))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'فشل رفع الملف')
      setUploadedFileId(data.fileId)
      setStep(1)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'حدث خطأ في رفع الملف')
    }
    setUploading(false)
  }

  const handleAddToCart = () => {
    addToCart({
      productId: `print-${uploadedFileId ?? 'file'}`,
      name: `طباعة: ${file?.name ?? 'ملف'}`,
      price,
      quantity: opts.quantity,
      options: {
        الحجم: opts.size,
        اللون: opts.color === 'color' ? 'ألوان' : 'أبيض وأسود',
        الطباعة: opts.sides === 'double' ? 'وجهين' : 'وجه واحد',
        الورق: opts.paperType === 'standard' ? 'عادي' : opts.paperType === 'glossy' ? 'لامع' : 'مطفي',
        النسخ: String(opts.copies),
      },
    })
    router.push('/cart')
  }

  const colorOpts = [
    { value: 'blackwhite', label: 'أبيض وأسود', desc: '0.05 د.أ/صفحة', icon: '⬛' },
    { value: 'color',      label: 'ألوان',       desc: '0.15 د.أ/صفحة', icon: '🌈' },
  ] as const
  const sideOpts = [
    { value: 'single', label: 'وجه واحد',  icon: '📄' },
    { value: 'double', label: 'وجهين',      icon: '📋' },
  ] as const
  const paperOpts = [
    { value: 'standard', label: 'ورق عادي', desc: '80 جرام' },
    { value: 'glossy',   label: 'ورق لامع', desc: 'مثالي للصور' },
    { value: 'matte',    label: 'ورق مطفي', desc: 'راقٍ واحترافي' },
  ] as const

  const btnCls = (active: boolean) =>
    `border-2 rounded-xl p-3 text-right transition-colors cursor-pointer ${active ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`

  return (
    <div className="py-10 px-4 bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">رفع ملف للطباعة</h1>

        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                i === step ? 'bg-primary text-white' : i < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-current">
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          {/* Step 0: Upload */}
          {step === 0 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">ارفع ملفك</h2>
              <UploadZone onFileSelect={setFile} />
              {uploadError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{uploadError}</div>
              )}
              <button
                disabled={!file || uploading}
                onClick={handleUploadFile}
                className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جارٍ رفع الملف...
                  </span>
                ) : 'التالي: خيارات الطباعة'}
              </button>
            </div>
          )}

          {/* Step 1: Print Options */}
          {step === 1 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">خيارات الطباعة</h2>
              <div className="space-y-5">
                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حجم الورق</label>
                  <div className="flex gap-2">
                    {(['A4','A3','Letter'] as const).map(s => (
                      <button key={s} type="button" onClick={() => setOpts(o => ({...o, size: s}))}
                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${opts.size === s ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الطباعة</label>
                  <div className="grid grid-cols-2 gap-3">
                    {colorOpts.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setOpts(o => ({...o, color: opt.value}))}
                        className={btnCls(opts.color === opt.value)}>
                        <div className="text-xl mb-1">{opt.icon}</div>
                        <div className="font-semibold text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Sides */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">وجهة الطباعة</label>
                  <div className="grid grid-cols-2 gap-3">
                    {sideOpts.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setOpts(o => ({...o, sides: opt.value}))}
                        className={btnCls(opts.sides === opt.value)}>
                        <span className="text-lg">{opt.icon}</span>
                        <span className="font-medium text-sm mr-2">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Paper */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الورق</label>
                  <div className="grid grid-cols-3 gap-2">
                    {paperOpts.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setOpts(o => ({...o, paperType: opt.value}))}
                        className={btnCls(opts.paperType === opt.value)}>
                        <div className="font-semibold text-xs">{opt.label}</div>
                        <div className="text-xs text-gray-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Copies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">عدد النسخ</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setOpts(o => ({...o, copies: Math.max(1, o.copies - 1)}))}
                      className="w-10 h-10 border border-gray-200 rounded-xl font-bold hover:border-primary transition-colors">−</button>
                    <span className="text-xl font-bold text-gray-900 w-8 text-center">{opts.copies}</span>
                    <button type="button" onClick={() => setOpts(o => ({...o, copies: o.copies + 1}))}
                      className="w-10 h-10 border border-gray-200 rounded-xl font-bold hover:border-primary transition-colors">+</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600">السابق</button>
                <button onClick={() => setStep(2)} className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">مراجعة الطلب</button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">مراجعة الطلب</h2>
              <div className="bg-surface rounded-xl p-4 space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">الملف</span>
                  <span className="font-medium truncate mr-4 max-w-48">{file?.name}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">الحجم</span><span className="font-medium">{opts.size}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">اللون</span><span className="font-medium">{opts.color === 'color' ? 'ألوان' : 'أبيض وأسود'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الوجهة</span><span className="font-medium">{opts.sides === 'double' ? 'وجهين' : 'وجه واحد'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الورق</span><span className="font-medium">{opts.paperType === 'standard' ? 'عادي' : opts.paperType === 'glossy' ? 'لامع' : 'مطفي'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">النسخ</span><span className="font-medium">{opts.copies}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-base">
                  <span>التكلفة المقدرة</span>
                  <span className="text-primary">{formatPrice(price)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-5">* السعر تقديري بناءً على {estimatedPages} صفحة. السعر النهائي بعد مراجعة الملف.</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600">السابق</button>
                <button onClick={() => { setStep(3); handleAddToCart() }} className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                  إضافة للسلة ←
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Added to cart */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
              <h2 className="font-bold text-xl text-gray-900 mb-2">تمت الإضافة للسلة!</h2>
              <p className="text-gray-500 mb-6">تمت إضافة طلب الطباعة إلى سلة التسوق</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setStep(0); setFile(null); setUploadedFileId(null) }}
                  className="border border-border px-5 py-3 rounded-xl font-medium text-gray-700 hover:bg-surface transition-colors">
                  رفع ملف آخر
                </button>
                <a href="/cart" className="bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                  إتمام الشراء
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
