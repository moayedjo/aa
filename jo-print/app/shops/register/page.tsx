'use client'

import { useState, FormEvent } from 'react'
import { CheckCircle, AlertCircle, Loader2, Users, BarChart3, Megaphone, CreditCard } from 'lucide-react'

const AREAS = ['عمان','الزرقاء','إربد','عجلون','جرش','المفرق','الكرك','مأدبا','العقبة','السلط']
const SERVICES = ['طباعة وثائق','بطاقات عمل','بانرات','تصميم','تصوير','تجليد','لاميناتور']

const BENEFITS = [
  { icon: Users, title: 'زيادة العملاء', desc: 'وصول لآلاف العملاء في منطقتك يبحثون عن خدمات الطباعة' },
  { icon: BarChart3, title: 'أدوات إدارة متقدمة', desc: 'لوحة تحكم متكاملة لإدارة الطلبات والمخزون والتقارير' },
  { icon: Megaphone, title: 'دعم تسويقي', desc: 'حملات ترويجية وظهور مميز على المنصة لجذب المزيد من العملاء' },
  { icon: CreditCard, title: 'نظام دفع آمن', desc: 'استقبال المدفوعات بأمان وتحويل فوري لحسابك البنكي' },
]

interface FormData {
  shopName: string
  area: string
  address: string
  phone: string
  email: string
  ownerName: string
  services: string[]
  workHours: string
  description: string
  documents: FileList | null
}

export default function ShopRegisterPage() {
  const [form, setForm] = useState<FormData>({
    shopName: '',
    area: '',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    services: [],
    workHours: '',
    description: '',
    documents: null,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function toggleService(service: string) {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service],
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body = {
        shopName: form.shopName,
        area: form.area,
        address: form.address,
        phone: form.phone,
        email: form.email,
        ownerName: form.ownerName,
        services: form.services,
        workHours: form.workHours,
        description: form.description,
      }

      const res = await fetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'حدث خطأ، يرجى المحاولة لاحقاً')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-5">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">تم إرسال طلبك بنجاح!</h2>
          <p className="text-gray-500 leading-relaxed">
            سيتواصل معك فريقنا خلال 48 ساعة لمراجعة طلبك وإتمام إجراءات الانضمام لشبكة JO-PRINT
          </p>
          <a
            href="/shops"
            className="mt-6 inline-block bg-[#1E88E5] text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            تصفح مكاتب الطباعة
          </a>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1E88E5] to-blue-700 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">انضم لشبكة JO-PRINT</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            وسّع نطاق عملك وانضم لمئات مكاتب الطباعة الشريكة في الأردن.
            استفد من منصتنا الرقمية لاستقطاب عملاء جدد وإدارة طلباتك بكل سهولة.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">لماذا تنضم إلينا؟</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center mb-3">
                <div className="bg-blue-50 p-3 rounded-full">
                  <Icon className="w-6 h-6 text-[#1E88E5]" />
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">نموذج التسجيل</h2>
          <p className="text-gray-500 mb-8">أكمل البيانات أدناه وسيتواصل معك فريقنا لإتمام الانضمام</p>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: shop name + area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  اسم المكتب / المحل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.shopName}
                  onChange={e => setForm(p => ({ ...p, shopName: e.target.value }))}
                  placeholder="مثال: مكتب النجاح للطباعة"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  المنطقة <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.area}
                  onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition bg-white"
                >
                  <option value="">اختر المنطقة</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                العنوان التفصيلي <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="مثال: شارع المدينة المنورة، بجانب دوار الداخلية، عمارة رقم 5"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition"
              />
            </div>

            {/* Row 2: phone + email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="07XXXXXXXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="shop@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Owner name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                اسم صاحب المكتب <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
                placeholder="الاسم الكامل"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition"
              />
            </div>

            {/* Services */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                الخدمات المتاحة
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {SERVICES.map(service => (
                  <label
                    key={service}
                    className={`flex items-center gap-2 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                      form.services.includes(service)
                        ? 'border-[#1E88E5] bg-blue-50 text-[#1E88E5]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={form.services.includes(service)}
                      onChange={() => toggleService(service)}
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      form.services.includes(service) ? 'bg-[#1E88E5] border-[#1E88E5]' : 'border-gray-300'
                    }`}>
                      {form.services.includes(service) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Work hours */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                أوقات العمل
              </label>
              <input
                type="text"
                value={form.workHours}
                onChange={e => setForm(p => ({ ...p, workHours: e.target.value }))}
                placeholder="8:00 ص - 9:00 م"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                وصف المكتب
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="اكتب نبذة عن مكتبك وخدماتك المميزة..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition resize-none"
              />
            </div>

            {/* Documents upload */}
            <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">رفع الوثائق</h3>
              <p className="text-sm text-gray-500 mb-4">
                سجل تجاري، شهادة تسجيل ضريبي — يُقبل PDF أو JPG أو PNG
              </p>
              <label className="cursor-pointer">
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-[#1E88E5] transition-colors w-fit">
                  <svg className="w-5 h-5 text-[#1E88E5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {form.documents && form.documents.length > 0
                      ? `${form.documents.length} ملف محدد`
                      : 'اختر الملفات'}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={e => setForm(p => ({ ...p, documents: e.target.files }))}
                />
              </label>
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                ملاحظة: رفع الوثائق سيكون متاحاً قريباً. بإمكانك إرسال الطلب الآن وإرسال الوثائق لاحقاً عند التواصل.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E88E5] hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري إرسال الطلب...
                  </>
                ) : (
                  'إرسال طلب الانضمام'
                )}
              </button>
              <p className="text-center text-sm text-gray-400 mt-3">
                بالإرسال توافق على <a href="/terms" className="text-[#1E88E5] hover:underline">شروط الاستخدام</a> و<a href="/privacy" className="text-[#1E88E5] hover:underline">سياسة الخصوصية</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
