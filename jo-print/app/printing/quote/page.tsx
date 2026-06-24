'use client'

import { useState } from 'react'
import { Sparkles, Printer, AlertCircle, CheckCircle, ChevronLeft, Send, RotateCcw } from 'lucide-react'
import Link from 'next/link'

interface QuoteResult {
  specs: {
    size?: string
    color?: string
    sides?: string
    binding?: string
    quantity?: number
    paperType?: string
  }
  missingInfo: string[]
  productionNotes: string[]
  summary: string
}

const EXAMPLES = [
  'أريد طباعة 50 نسخة من ملف PDF رسالة جامعية، ورق A4، أبيض وأسود، سبيرال',
  'محتاج 200 بطاقة عمل ملونة على ورق لامع، وجهين',
  'طباعة بروشور 100 نسخة A4 ملون من وجه واحد',
  'أريد طباعة كتيب تدريبي 30 صفحة، 10 نسخ، تدبيس',
]

export default function QuotePage() {
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/ai/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'حدث خطأ'); return }
      setResult(data)
    } catch {
      setError('حدث خطأ في الاتصال، يرجى المحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setDescription(''); setResult(null); setError('') }

  const specEntries = result
    ? Object.entries({
        'حجم الورق': result.specs.size,
        'نوع الطباعة': result.specs.color,
        'عدد الأوجه': result.specs.sides,
        'التجليد': result.specs.binding,
        'عدد النسخ': result.specs.quantity ? `${result.specs.quantity} نسخة` : undefined,
        'نوع الورق': result.specs.paperType,
      }).filter(([, v]) => v)
    : []

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary/5 to-blue-50 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/printing" className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 mb-4">
            <ChevronLeft size={14} /> خدمات الطباعة
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">مساعد الاقتباس الذكي</h1>
          </div>
          <p className="text-gray-600 text-sm">
            صِف طلب الطباعة بكلماتك — سيحلل النظام وصفك ويستخلص مواصفات واضحة ويخبرك بأي معلومات ناقصة.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Input form */}
        {!result && (
          <div className="bg-white rounded-2xl border border-border p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  صِف طلبك بالعربية
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="مثال: أريد طباعة 100 نسخة من ملف PDF رسالة جامعية، ورق A4، أبيض وأسود، سبيرال"
                  rows={4}
                  maxLength={1500}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>اكتب وصفاً واضحاً لطلب الطباعة</span>
                  <span>{description.length}/1500</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> جاري التحليل...</>
                ) : (
                  <><Send size={16} /> تحليل الطلب</>
                )}
              </button>
            </form>

            {/* Examples */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs text-gray-500 mb-3">أمثلة سريعة:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(ex)}
                    className="text-xs bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 px-3 py-1.5 rounded-full transition-colors text-right"
                  >
                    {ex.length > 45 ? ex.slice(0, 45) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={18} className="text-green-500" />
                    <h2 className="font-bold text-gray-900">تم تحليل طلبك</h2>
                  </div>
                  <p className="text-sm text-gray-600">{result.summary}</p>
                </div>
                <button onClick={reset} className="text-gray-400 hover:text-gray-700 shrink-0">
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>

            {/* Specs */}
            {specEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Printer size={16} className="text-primary" /> المواصفات المستخلصة
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {specEntries.map(([label, value]) => (
                    <div key={label} className="bg-primary/5 rounded-xl p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">{label}</div>
                      <div className="font-semibold text-primary text-sm">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing info */}
            {result.missingInfo.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} /> معلومات ناقصة
                </h3>
                <ul className="space-y-2">
                  {result.missingInfo.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-0.5 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Production notes */}
            {result.productionNotes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-800 mb-3">ملاحظات الإنتاج</h3>
                <ul className="space-y-2">
                  {result.productionNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                      <span className="mt-1 w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="bg-white rounded-2xl border border-border p-5 flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 text-sm text-gray-600">
                هل أنت جاهز لرفع ملفك وإتمام الطلب؟
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={reset} className="flex-1 sm:flex-none border border-border px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  طلب جديد
                </button>
                <Link href="/printing/upload" className="flex-1 sm:flex-none bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 text-center">
                  رفع الملف الآن
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
