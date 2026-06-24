'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/pricing'
import { getCart, getCartTotal, clearCart } from '@/lib/cart'
import type { CartItem } from '@/lib/types'

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [delivery, setDelivery] = useState<'delivery' | 'pickup'>('pickup')
  const [payment, setPayment] = useState<string>('cash')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)

  const PROMO_CODES: Record<string, number> = {
    'GRAD15': 0.15,
    'JOPRINT10': 0.10,
    'WELCOME5': 0.05,
  }

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    const discount = PROMO_CODES[code]
    if (!discount) { setPromoError('كود الخصم غير صحيح'); setPromoDiscount(0); return }
    setPromoDiscount(discount)
    setPromoApplied(true)
    setPromoError('')
  }

  const PAYMENT_METHODS = [
    { id: 'cash',         label: 'الدفع عند الاستلام',  icon: '💵', desc: 'ادفع نقداً عند استلام الطلب' },
    { id: 'card',         label: 'بطاقة Visa / Mastercard', icon: '💳', desc: 'ادفع بالبطاقة البنكية بأمان' },
    { id: 'zain_cash',    label: 'Zain Cash',             icon: '📱', desc: 'محفظة زين كاش' },
    { id: 'orange_money', label: 'Orange Money',          icon: '🟠', desc: 'محفظة أورنج موني' },
    { id: 'efawateer',    label: 'eFawateercom',           icon: '🏦', desc: 'الفواتير الإلكترونية' },
    { id: 'cliq',         label: 'CliQ',                  icon: '⚡', desc: 'الدفع الفوري' },
  ]
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '',
    address: '', city: 'عمان', notes: '',
  })

  useEffect(() => {
    setCart(getCart())
    setMounted(true)
  }, [])

  const upd = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  const { subtotal, total } = getCartTotal(cart)
  const deliveryFee = (delivery === 'delivery' && subtotal < 20) ? 2.0 : 0
  const discountAmount = promoDiscount > 0 ? (subtotal * promoDiscount) : 0
  const finalTotal = subtotal + deliveryFee - discountAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!form.fullName.trim()) { setError('الرجاء إدخال الاسم الكامل'); return }
    if (!form.phone.trim()) { setError('الرجاء إدخال رقم الهاتف'); return }
    if (!/^(?:\+?962|0)7[0-9]{8}$/.test(form.phone.trim().replace(/\s/g, ''))) { setError('رقم الهاتف غير صحيح — يجب أن يبدأ بـ 07 ويتكون من 10 أرقام'); return }
    if (delivery === 'delivery' && !form.address.trim()) { setError('الرجاء إدخال عنوان التوصيل'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.fullName,
          customerPhone: form.phone,
          customerEmail: form.email || null,
          deliveryMethod: delivery,
          deliveryAddress: delivery === 'delivery' ? `${form.address}، ${form.city}` : null,
          paymentMethod: payment,
          subtotal,
          deliveryFee,
          total: finalTotal,
          promoCode: promoApplied ? promoCode.trim().toUpperCase() : null,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          notes: form.notes || null,
          items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            options: item.options ?? null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'فشل في إنشاء الطلب')

      clearCart()
      router.push(`/orders/confirmation?id=${data.order.order_number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ، يرجى المحاولة مرة أخرى')
      setLoading(false)
    }
  }

  if (!mounted) return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (cart.length === 0) {
    return (
      <div className="py-24 px-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-3">لا توجد منتجات في السلة</h2>
        <a href="/store" className="text-primary hover:underline">تصفح المتجر</a>
      </div>
    )
  }

  const inputClass = 'w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="py-10 px-4 bg-surface min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">إتمام الشراء</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Contact */}
              <div className="bg-white border border-border rounded-xl p-5">
                <h2 className="font-bold text-gray-900 mb-4">معلومات التواصل</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>الاسم الكامل <span className="text-red-500">*</span></label>
                    <input type="text" required value={form.fullName} onChange={upd('fullName')} className={inputClass} placeholder="محمد أحمد" />
                  </div>
                  <div>
                    <label className={labelClass}>رقم الهاتف <span className="text-red-500">*</span></label>
                    <input type="tel" required value={form.phone} onChange={upd('phone')} className={inputClass} placeholder="07XXXXXXXX" dir="ltr" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>البريد الإلكتروني <span className="text-gray-400 text-xs">(اختياري)</span></label>
                    <input type="email" value={form.email} onChange={upd('email')} className={inputClass} placeholder="example@email.com" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-white border border-border rounded-xl p-5">
                <h2 className="font-bold text-gray-900 mb-4">طريقة الاستلام</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { key: 'pickup' as const, label: 'استلام من المكتب', icon: '🏪', desc: 'مجاناً — عمان' },
                    { key: 'delivery' as const, label: 'توصيل للمنزل', icon: '🚚', desc: 'مجاناً للطلبات فوق 20 د.أ — 24-48 ساعة' },
                  ].map(opt => (
                    <button type="button" key={opt.key} onClick={() => setDelivery(opt.key)}
                      className={`p-4 rounded-xl border-2 text-right transition-colors ${delivery === opt.key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {delivery === 'delivery' && (
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>العنوان <span className="text-red-500">*</span></label>
                      <input type="text" value={form.address} onChange={upd('address')} className={inputClass} placeholder="الشارع، رقم البناية، الطابق، الشقة" />
                    </div>
                    <div>
                      <label className={labelClass}>المدينة</label>
                      <input type="text" value={form.city} onChange={upd('city')} className={inputClass} placeholder="عمان" />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="bg-white border border-border rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-3">طريقة الدفع</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id} type="button"
                      onClick={() => setPayment(m.id)}
                      className={`p-3 rounded-xl border-2 text-right transition-colors ${
                        payment === m.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{m.icon}</span>
                        <span className="font-semibold text-sm">{m.label}</span>
                      </div>
                      <div className="text-xs text-gray-400">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Promo Code */}
              <div className="bg-white border border-border rounded-xl p-5">
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">كود الخصم</h3>
                  {promoApplied ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <span className="text-green-600 font-bold text-sm">✓ تم تطبيق خصم {Math.round(promoDiscount * 100)}%</span>
                      <button onClick={() => { setPromoApplied(false); setPromoDiscount(0); setPromoCode('') }} className="text-xs text-gray-400 hover:text-red-500 mr-auto">إزالة</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoError('') }}
                        placeholder="أدخل كود الخصم" dir="ltr"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                      <button onClick={applyPromo} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">تطبيق</button>
                    </div>
                  )}
                  {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white border border-border rounded-xl p-5">
                <h2 className="font-bold text-gray-900 mb-4">ملاحظات إضافية <span className="text-gray-400 text-xs font-normal">(اختياري)</span></h2>
                <textarea value={form.notes} onChange={upd('notes')} rows={3}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                  placeholder="أي تعليمات خاصة بطلبك..." />
              </div>
            </div>

            {/* Summary */}
            <div className="h-fit sticky top-4">
              <div className="bg-white border border-border rounded-xl p-5">
                <h2 className="font-bold text-gray-900 mb-4">ملخص الطلب</h2>
                <div className="space-y-2 text-sm mb-4 max-h-48 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-gray-600">
                      <span className="truncate ml-2">{item.name} × {item.quantity}</span>
                      <span className="flex-shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm mb-5">
                  <div className="flex justify-between text-gray-600">
                    <span>المجموع الفرعي</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>التوصيل</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>{deliveryFee === 0 ? 'مجاناً' : formatPrice(deliveryFee)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>خصم ({Math.round(promoDiscount * 100)}%)</span>
                      <span>- {formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                    <span>الإجمالي</span>
                    <span className="text-primary">{formatPrice(finalTotal)}</span>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جارٍ إرسال الطلب...
                    </span>
                  ) : 'تأكيد الطلب ✓'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">بالضغط توافق على الشروط والأحكام</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

