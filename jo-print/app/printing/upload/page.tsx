'use client'

import { useState } from 'react'
import UploadZone from '@/components/printing/UploadZone'
import type { PrintOptions } from '@/lib/types'
import { formatPrice, calculatePrintPrice } from '@/lib/pricing'
import { addToCart } from '@/lib/cart'
import { FileText, Printer, GalleryHorizontalEnd, BookMarked, ChevronLeft, Check, AlertCircle } from 'lucide-react'

const STEPS = ['رفع الملف', 'خيارات الطباعة', 'مراجعة', 'تأكيد']

const DEFAULT_OPTS: PrintOptions = {
  productType: 'paper',
  size: 'A4', color: 'blackwhite', sides: 'single',
  paperType: 'standard', binding: 'none',
  copies: 1, pageRange: 'all', pageRangeValue: '',
  customCut: false, coverFront: 'none', coverBack: 'none',
  posterFoamBoard: false,
  gradName: '', gradSpecialization: '', gradUniversity: '', gradYear: '', gradText: '',
  notes: '',
  quantity: 1, addCover: false, addPageNumbers: false, addTOC: false,
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`border-2 rounded-xl p-3 text-right transition-all cursor-pointer w-full ${
        active ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
      }`}>
      {children}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-2">{children}</label>
}

function RowToggle<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; sub?: string }[] }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className={`grid gap-2 grid-cols-${Math.min(options.length, 4)}`} style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
              value === o.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}>
            <div>{o.label}</div>
            {o.sub && <div className="text-xs font-normal text-gray-400 mt-0.5">{o.sub}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function UploadPage() {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [manualPages, setManualPages] = useState(10)
  const [opts, setOpts] = useState<PrintOptions>(DEFAULT_OPTS)

  const set = <K extends keyof PrintOptions>(key: K, val: PrintOptions[K]) =>
    setOpts(o => ({ ...o, [key]: val }))

  const estimatedPages = pageCount ?? manualPages
  const price = calculatePrintPrice(opts, estimatedPages)

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
      if (data.pageCount) setPageCount(data.pageCount)
      setStep(1)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'حدث خطأ في رفع الملف')
    }
    setUploading(false)
  }

  const handleAddToCart = () => {
    const optionsSummary: Record<string, string> = {}
    if (opts.productType === 'paper') {
      optionsSummary['الحجم'] = opts.size
      optionsSummary['اللون'] = opts.color === 'color' ? 'ألوان' : 'أبيض وأسود'
      optionsSummary['الطباعة'] = opts.sides === 'double' ? 'وجهين' : 'وجه واحد'
      optionsSummary['الورق'] = { standard: 'عادي', glossy: 'لامع', matte: 'مطفي' }[opts.paperType] ?? opts.paperType
      if (opts.binding !== 'none') optionsSummary['التجليد'] = opts.binding === 'staple' ? 'تدبيس' : 'سلك'
      if (opts.customCut) optionsSummary['قص مخصص'] = 'نعم'
      if (opts.coverFront !== 'none') optionsSummary['غلاف أمامي'] = opts.coverFront === 'transparent' ? 'بلاستيك شفاف' : 'كرتون'
      if (opts.coverBack !== 'none') optionsSummary['غلاف خلفي'] = opts.coverBack === 'transparent' ? 'بلاستيك شفاف' : 'كرتون'
      optionsSummary['النسخ'] = String(opts.copies)
    } else if (opts.productType === 'poster') {
      optionsSummary['المقاس'] = 'A1'
      if (opts.posterFoamBoard) optionsSummary['Foam Board'] = 'نعم'
    } else if (opts.productType === 'gradalbum') {
      if (opts.gradName) optionsSummary['الاسم'] = opts.gradName
      if (opts.gradUniversity) optionsSummary['الجامعة'] = opts.gradUniversity
      if (opts.gradYear) optionsSummary['السنة'] = opts.gradYear
    }

    const typeLabel = {
      paper: 'طباعة ورق',
      poster: 'بوستر A1',
      rollup: 'Roll-Up',
      gradalbum: 'دفتر تخرج',
    }[opts.productType]

    addToCart({
      productId: `print-${uploadedFileId ?? 'file'}`,
      name: `${typeLabel}: ${file?.name ?? 'ملف'}`,
      price,
      quantity: opts.copies,
      options: optionsSummary,
    })
  }

  const isPaper = opts.productType === 'paper'

  return (
    <div className="py-10 px-4 bg-surface min-h-screen" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">رفع ملف للطباعة</h1>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                i === step ? 'bg-primary text-white' : i < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-current">
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">

          {/* ── Step 0: Upload ── */}
          {step === 0 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">ارفع ملفك</h2>
              <UploadZone onFileSelect={setFile} />
              {uploadError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />{uploadError}
                </div>
              )}
              <button disabled={!file || uploading} onClick={handleUploadFile}
                className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors">
                {uploading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />جارٍ رفع الملف...</span>
                  : 'التالي: خيارات الطباعة'}
              </button>
            </div>
          )}

          {/* ── Step 1: Print Options ── */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-bold text-xl text-gray-900">خيارات الطباعة</h2>

              {/* نوع المنتج */}
              <div>
                <SectionLabel>نوع المنتج</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleBtn active={opts.productType === 'paper'} onClick={() => set('productType', 'paper')}>
                    <div className="flex items-center gap-2 mb-1">
                      <Printer size={18} className={opts.productType === 'paper' ? 'text-primary' : 'text-gray-400'} />
                      <span className="font-semibold text-sm">طباعة ورق</span>
                    </div>
                    <p className="text-xs text-gray-400">وثائق، PDF، ملفات دراسية</p>
                  </ToggleBtn>
                  <ToggleBtn active={opts.productType !== 'paper'} onClick={() => set('productType', 'poster')}>
                    <div className="flex items-center gap-2 mb-1">
                      <GalleryHorizontalEnd size={18} className={opts.productType !== 'paper' ? 'text-primary' : 'text-gray-400'} />
                      <span className="font-semibold text-sm">منتجات أخرى</span>
                    </div>
                    <p className="text-xs text-gray-400">بوستر، Roll-Up، دفتر تخرج</p>
                  </ToggleBtn>
                </div>
              </div>

              {/* ── منتجات أخرى ── */}
              {!isPaper && (
                <div className="space-y-4">
                  <SectionLabel>اختر المنتج</SectionLabel>
                  <div className="grid grid-cols-1 gap-3">
                    {/* بوستر */}
                    <ToggleBtn active={opts.productType === 'poster'} onClick={() => set('productType', 'poster')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎨</span>
                          <div>
                            <p className="font-semibold text-sm">طباعة بوستر</p>
                            <p className="text-xs text-gray-400">مقاس A1 — طباعة فاخرة</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary text-sm">5.000 د.أ</p>
                          {opts.productType === 'poster' && <Check size={14} className="text-primary mx-auto" />}
                        </div>
                      </div>
                    </ToggleBtn>

                    {/* Foam Board على البوستر */}
                    {opts.productType === 'poster' && (
                      <div className="mr-8 border border-dashed border-gray-200 rounded-xl p-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-sm font-medium">إضافة Foam Board</p>
                            <p className="text-xs text-gray-400">لوح رغوي صلب خلف البوستر</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-primary font-semibold">+2.000 د.أ</span>
                            <input type="checkbox" checked={opts.posterFoamBoard}
                              onChange={e => set('posterFoamBoard', e.target.checked)}
                              className="w-4 h-4 accent-primary" />
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Roll-Up */}
                    <ToggleBtn active={opts.productType === 'rollup'} onClick={() => set('productType', 'rollup')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📜</span>
                          <div>
                            <p className="font-semibold text-sm">طباعة Roll-Up</p>
                            <p className="text-xs text-gray-400">لافتة قابلة للسحب مع حامل</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary text-sm">10.000 د.أ</p>
                          {opts.productType === 'rollup' && <Check size={14} className="text-primary mx-auto" />}
                        </div>
                      </div>
                    </ToggleBtn>

                    {/* دفتر تخرج */}
                    <ToggleBtn active={opts.productType === 'gradalbum'} onClick={() => set('productType', 'gradalbum')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎓</span>
                          <div>
                            <p className="font-semibold text-sm">دفتر تخرج مخصص</p>
                            <p className="text-xs text-gray-400">تصميم باسمك وتخصصك وجامعتك</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary text-sm">15.000 د.أ</p>
                          {opts.productType === 'gradalbum' && <Check size={14} className="text-primary mx-auto" />}
                        </div>
                      </div>
                    </ToggleBtn>

                    {/* تفاصيل دفتر التخرج */}
                    {opts.productType === 'gradalbum' && (
                      <div className="mr-0 border border-dashed border-primary/30 rounded-xl p-4 space-y-3">
                        <p className="text-xs text-gray-500 font-medium">تفاصيل دفتر التخرج (اختياري)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="الاسم الكامل" value={opts.gradName} onChange={e => set('gradName', e.target.value)}
                            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                          <input placeholder="التخصص" value={opts.gradSpecialization} onChange={e => set('gradSpecialization', e.target.value)}
                            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                          <input placeholder="الجامعة" value={opts.gradUniversity} onChange={e => set('gradUniversity', e.target.value)}
                            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                          <input placeholder="سنة التخرج" value={opts.gradYear} onChange={e => set('gradYear', e.target.value)}
                            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        </div>
                        <textarea placeholder="نص خاص أو اقتباس (اختياري)" value={opts.gradText} onChange={e => set('gradText', e.target.value)}
                          rows={2} maxLength={300}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── خيارات طباعة الورق ── */}
              {isPaper && (
                <div className="space-y-5">
                  <RowToggle label="حجم الورق" value={opts.size} onChange={v => set('size', v)}
                    options={[
                      { value: 'A4', label: 'A4', sub: 'الأكثر شيوعاً' },
                      { value: 'A3', label: 'A3', sub: 'ضعف A4' },
                      { value: 'Letter', label: 'Letter', sub: 'أمريكي' },
                    ]} />

                  <RowToggle label="نوع الطباعة" value={opts.color} onChange={v => set('color', v)}
                    options={[
                      { value: 'blackwhite', label: 'أبيض وأسود', sub: '0.05 د.أ/صفحة' },
                      { value: 'color', label: 'ألوان', sub: '0.15 د.أ/صفحة' },
                    ]} />

                  <RowToggle label="وجهة الطباعة" value={opts.sides} onChange={v => set('sides', v)}
                    options={[
                      { value: 'single', label: 'وجه واحد' },
                      { value: 'double', label: 'وجهين', sub: 'وفّر الورق' },
                    ]} />

                  <RowToggle label="نوع الورق" value={opts.paperType} onChange={v => set('paperType', v)}
                    options={[
                      { value: 'standard', label: 'عادي', sub: '80 جرام' },
                      { value: 'glossy',   label: 'لامع', sub: '×2.5' },
                      { value: 'matte',    label: 'مطفي', sub: '×2.0' },
                    ]} />

                  <RowToggle label="نوع التجليد" value={opts.binding} onChange={v => set('binding', v)}
                    options={[
                      { value: 'none',   label: 'بدون' },
                      { value: 'staple', label: 'تدبيس', sub: '+0.15 د.أ' },
                      { value: 'wire',   label: 'سلك (سبيرال)', sub: '+0.75 د.أ' },
                    ]} />

                  {/* الصفحات المطلوبة */}
                  <div>
                    <SectionLabel>الصفحات المطلوبة</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => set('pageRange', 'all')}
                        className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                          opts.pageRange === 'all' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700'}`}>
                        الملف كاملاً
                      </button>
                      <button type="button" onClick={() => set('pageRange', 'custom')}
                        className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                          opts.pageRange === 'custom' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700'}`}>
                        صفحات محددة
                      </button>
                    </div>
                    {opts.pageRange === 'custom' && (
                      <input
                        placeholder="مثال: 1-10، 15، 20-25"
                        value={opts.pageRangeValue}
                        onChange={e => set('pageRangeValue', e.target.value)}
                        className="mt-2 w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    )}
                  </div>

                  {/* عدد النسخ */}
                  <div>
                    <SectionLabel>عدد النسخ</SectionLabel>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => set('copies', Math.max(1, opts.copies - 1))}
                        className="w-10 h-10 border border-gray-200 rounded-xl font-bold text-lg hover:border-primary transition-colors">−</button>
                      <span className="text-xl font-bold text-gray-900 w-10 text-center">{opts.copies}</span>
                      <button type="button" onClick={() => set('copies', opts.copies + 1)}
                        className="w-10 h-10 border border-gray-200 rounded-xl font-bold text-lg hover:border-primary transition-colors">+</button>
                    </div>
                  </div>

                  {/* ── خيارات إضافية ── */}
                  <div>
                    <SectionLabel>⚙️ خيارات إضافية</SectionLabel>
                    <div className="space-y-2">
                      {/* قص مخصص */}
                      <label className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">قصّ وتقطيع مخصص</p>
                          <p className="text-xs text-gray-400">قص دقيق حسب المقاسات المطلوبة</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-primary font-semibold">+1.000 د.أ</span>
                          <input type="checkbox" checked={opts.customCut} onChange={e => set('customCut', e.target.checked)} className="w-4 h-4 accent-primary" />
                        </div>
                      </label>

                      {/* غلاف أمامي */}
                      <div className="border border-gray-200 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">إضافة غلاف أمامي</p>
                            <p className="text-xs text-gray-400">يحمي الوثيقة ويعطيها مظهراً احترافياً</p>
                          </div>
                          <span className="text-sm text-primary font-semibold">+1.000 د.أ</span>
                        </div>
                        <div className="flex gap-2">
                          {(['none', 'transparent', 'cardboard'] as const).map(v => (
                            <button key={v} type="button" onClick={() => set('coverFront', v)}
                              className={`flex-1 py-1.5 text-xs rounded-lg border-2 transition-colors ${
                                opts.coverFront === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'
                              }`}>
                              {v === 'none' ? 'بدون' : v === 'transparent' ? 'بلاستيك شفاف' : 'كرتون مقوى'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* غلاف خلفي */}
                      <div className="border border-gray-200 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">إضافة غلاف خلفي</p>
                            <p className="text-xs text-gray-400">دعم قوي لظهر الوثيقة</p>
                          </div>
                          <span className="text-sm text-primary font-semibold">+1.000 د.أ</span>
                        </div>
                        <div className="flex gap-2">
                          {(['none', 'transparent', 'cardboard'] as const).map(v => (
                            <button key={v} type="button" onClick={() => set('coverBack', v)}
                              className={`flex-1 py-1.5 text-xs rounded-lg border-2 transition-colors ${
                                opts.coverBack === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'
                              }`}>
                              {v === 'none' ? 'بدون' : v === 'transparent' ? 'بلاستيك شفاف' : 'كرتون مقوى'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ملاحظات العميل (لجميع الأنواع) ── */}
              <div>
                <SectionLabel>📝 تعليمات أو ملاحظات خاصة (اختياري)</SectionLabel>
                <textarea
                  placeholder="مثال: يرجى وضع الغلاف الشفاف في الأمام والكرتون في الخلف، وقص البوستر بدون حواف بيضاء."
                  value={opts.notes}
                  onChange={e => set('notes', e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-left">{opts.notes.length}/500</p>
              </div>

              {/* السعر التقديري */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">السعر التقديري</span>
                <span className="font-bold text-primary text-lg">{formatPrice(price)}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50">السابق</button>
                <button onClick={() => setStep(2)} className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">مراجعة الطلب</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Review ── */}
          {step === 2 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">مراجعة الطلب</h2>
              <div className="bg-surface rounded-xl p-4 space-y-2.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">الملف</span>
                  <span className="font-medium truncate mr-4 max-w-xs">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">نوع المنتج</span>
                  <span className="font-medium">{{ paper: 'طباعة ورق', poster: 'بوستر A1', rollup: 'Roll-Up', gradalbum: 'دفتر تخرج' }[opts.productType]}</span>
                </div>
                {isPaper && <>
                  <div className="flex justify-between"><span className="text-gray-500">الحجم</span><span className="font-medium">{opts.size}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">اللون</span><span className="font-medium">{opts.color === 'color' ? 'ألوان' : 'أبيض وأسود'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الوجهة</span><span className="font-medium">{opts.sides === 'double' ? 'وجهين' : 'وجه واحد'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الورق</span><span className="font-medium">{{ standard: 'عادي', glossy: 'لامع', matte: 'مطفي' }[opts.paperType]}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">التجليد</span><span className="font-medium">{{ none: 'بدون', staple: 'تدبيس', wire: 'سلك' }[opts.binding]}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">النسخ</span><span className="font-medium">{opts.copies}</span></div>
                  {opts.pageRange === 'custom' && opts.pageRangeValue && (
                    <div className="flex justify-between"><span className="text-gray-500">الصفحات</span><span className="font-medium">{opts.pageRangeValue}</span></div>
                  )}
                  {opts.customCut && <div className="flex justify-between"><span className="text-gray-500">قص مخصص</span><span className="font-medium text-primary">+1.000 د.أ</span></div>}
                  {opts.coverFront !== 'none' && <div className="flex justify-between"><span className="text-gray-500">غلاف أمامي</span><span className="font-medium">{opts.coverFront === 'transparent' ? 'بلاستيك' : 'كرتون'} +1.000 د.أ</span></div>}
                  {opts.coverBack !== 'none' && <div className="flex justify-between"><span className="text-gray-500">غلاف خلفي</span><span className="font-medium">{opts.coverBack === 'transparent' ? 'بلاستيك' : 'كرتون'} +1.000 د.أ</span></div>}
                </>}
                {opts.productType === 'poster' && opts.posterFoamBoard && (
                  <div className="flex justify-between"><span className="text-gray-500">Foam Board</span><span className="font-medium text-primary">+2.000 د.أ</span></div>
                )}
                {opts.productType === 'gradalbum' && opts.gradName && (
                  <div className="flex justify-between"><span className="text-gray-500">الخريج</span><span className="font-medium">{opts.gradName}</span></div>
                )}
                {opts.notes && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-500 text-xs">ملاحظات:</span>
                    <p className="text-xs text-gray-700 mt-1 leading-relaxed">{opts.notes}</p>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-base">
                  <span>التكلفة التقديرية</span>
                  <span className="text-primary">{formatPrice(price)}</span>
                </div>
              </div>

              {isPaper && !pageCount && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3 text-sm">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <span className="text-amber-700 flex-1">عدد الصفحات تقديري — أدخله لدقة أعلى:</span>
                  <input type="number" min={1} value={manualPages}
                    onChange={e => setManualPages(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 border border-amber-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none" />
                </div>
              )}
              <p className="text-xs text-gray-400 mb-5">
                * السعر تقديري — السعر النهائي يُحدد بعد مراجعة الملف من قِبل المطبعة.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50">السابق</button>
                <button onClick={() => { handleAddToCart(); setStep(3) }}
                  className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                  إضافة للسلة ←
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
              <h2 className="font-bold text-xl text-gray-900 mb-2">تمت الإضافة للسلة!</h2>
              <p className="text-gray-500 mb-6">تمت إضافة طلب الطباعة إلى سلة التسوق</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setStep(0); setFile(null); setUploadedFileId(null); setOpts(DEFAULT_OPTS) }}
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
