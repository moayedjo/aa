'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import { formatPrice } from '@/lib/pricing'

export default function CheckoutPage() {
  const [delivery, setDelivery] = useState<'delivery' | 'pickup'>('delivery')
  const [payment, setPayment] = useState<'cod' | 'card'>('cod')

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">إتمام الشراء</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contact Info */}
            <div className="bg-white border border-border rounded-[12px] p-5">
              <h2 className="font-bold text-gray-900 mb-4">معلومات التواصل</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="الاسم الكامل" placeholder="محمد أحمد" type="text" />
                <Input label="رقم الهاتف" placeholder="07XXXXXXXX" type="tel" />
                <Input label="البريد الإلكتروني" placeholder="example@email.com" type="email" className="sm:col-span-2" />
              </div>
            </div>

            {/* Delivery Method */}
            <div className="bg-white border border-border rounded-[12px] p-5">
              <h2 className="font-bold text-gray-900 mb-4">طريقة الاستلام</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'delivery', label: 'توصيل للمنزل', icon: '🚚', desc: '24-48 ساعة' },
                  { key: 'pickup', label: 'استلام من المكتب', icon: '🏪', desc: 'مجاناً' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setDelivery(opt.key as 'delivery' | 'pickup')}
                    className={`p-4 rounded-xl border-2 text-right transition-colors ${
                      delivery === opt.key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {delivery === 'delivery' && (
                <div className="mt-4 space-y-3">
                  <Input label="العنوان" placeholder="الشارع، البناية، الطابق" type="text" />
                  <Input label="المدينة" placeholder="عمان" type="text" />
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white border border-border rounded-[12px] p-5">
              <h2 className="font-bold text-gray-900 mb-4">طريقة الدفع</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'cod', label: 'دفع عند الاستلام', icon: '💵' },
                  { key: 'card', label: 'بطاقة ائتمان', icon: '💳' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPayment(opt.key as 'cod' | 'card')}
                    className={`p-4 rounded-xl border-2 text-right transition-colors ${
                      payment === opt.key ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white border border-border rounded-[12px] p-5 h-fit">
            <h2 className="font-bold text-gray-900 mb-4">ملخص الطلب</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">بطاقات عمل × 2</span>
                <span>{formatPrice(7.00)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">تيشيرت مطبوع × 1</span>
                <span>{formatPrice(12.00)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">التوصيل</span>
                <span>{delivery === 'pickup' ? 'مجاناً' : formatPrice(2.00)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100">
                <span>الإجمالي</span>
                <span className="text-primary">{formatPrice(delivery === 'pickup' ? 19.00 : 21.00)}</span>
              </div>
            </div>
            <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors">
              تأكيد الطلب
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">بالضغط توافق على الشروط والأحكام</p>
          </div>
        </div>
      </div>
    </div>
  )
}
