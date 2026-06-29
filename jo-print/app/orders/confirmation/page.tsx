'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ConfirmationContent() {
  const params = useSearchParams()
  const orderNumber = params.get('id') ?? '—'

  return (
    <div className="py-20 px-4 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">تم استلام طلبك!</h1>
        <p className="text-gray-500 mb-6">شكراً لثقتك بـ JO-PRINT. سنتواصل معك قريباً لتأكيد الطلب.</p>

        <div className="bg-surface border border-border rounded-2xl p-6 mb-8 text-right">
          <p className="text-sm text-gray-500 mb-1">رقم طلبك</p>
          <p className="text-2xl font-bold font-mono text-primary tracking-wider">{orderNumber}</p>
          <p className="text-xs text-gray-400 mt-2">احتفظ بهذا الرقم لتتبع طلبك</p>
        </div>

        <div className="space-y-3">
          <Link href={`/orders/track?q=${orderNumber}`}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold block hover:bg-blue-700 transition-colors">
            تتبع الطلب
          </Link>
          <Link href="/"
            className="w-full border border-border text-gray-700 py-3 rounded-xl font-medium block hover:bg-surface transition-colors">
            العودة للرئيسية
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-400 space-y-1">
          <p>📞 للاستفسار: <span dir="ltr">{process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+962781141113'}</span></p>
          <p>⏱️ وقت التجهيز: 24-48 ساعة</p>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
