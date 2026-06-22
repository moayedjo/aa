'use client'
import { useState } from 'react'

const faqs = [
  { q: 'ما هي الملفات المقبولة للطباعة؟', a: 'نقبل ملفات PDF وDOC وDOCX وPPT وPPTX وJPG وPNG. الحد الأقصى لحجم الملف 50 ميغابايت. يُفضل رفع ملفات PDF للحصول على أفضل جودة طباعة.' },
  { q: 'كم يستغرق تجهيز الطلب؟', a: 'معظم الطلبات تُجهز خلال 24-48 ساعة من تأكيد الملف. الطلبات العاجلة تُجهز في نفس اليوم بسعر إضافي.' },
  { q: 'هل يمكنني إلغاء طلبي؟', a: 'يمكن إلغاء الطلب قبل بدء الإنتاج. بمجرد بدء الطباعة لا يمكن الإلغاء. تواصل معنا على الفور إذا أردت الإلغاء.' },
  { q: 'ما هي مناطق التوصيل؟', a: 'نوصّل لجميع مناطق عمّان والزرقاء وإربد والعقبة. رسوم التوصيل 2 دينار، مجاني للطلبات فوق 20 دينار.' },
  { q: 'كيف أتابع حالة طلبي؟', a: 'يمكنك تتبع طلبك من صفحة "تتبع الطلب" باستخدام رقم الطلب الذي وصلك عند التأكيد.' },
  { q: 'هل الدفع الإلكتروني متاح؟', a: 'حالياً ندعم الدفع عند الاستلام. الدفع الإلكتروني بالبطاقة سيكون متاحاً قريباً.' },
  { q: 'ماذا أفعل إذا كانت جودة الطباعة سيئة؟', a: 'نضمن جودة الطباعة. في حال وجود مشكلة بسبب خطأ منّا نعيد الطباعة مجاناً. تواصل معنا خلال 24 ساعة من الاستلام.' },
  { q: 'هل يمكنني طباعة كميات كبيرة؟', a: 'نعم، نوفر خدمة الطباعة بالجملة مع أسعار مخفضة للكميات الكبيرة. تواصل معنا للحصول على عرض سعر خاص.' },
]

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="py-14 px-4 bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">الأسئلة الشائعة</h1>
          <p className="text-gray-500">إجابات على أكثر الأسئلة شيوعاً</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-right hover:bg-surface/50 transition-colors">
                <span className="font-semibold text-gray-900 text-sm">{faq.q}</span>
                <span className={`text-primary text-xl transition-transform flex-shrink-0 mr-3 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <p className="font-semibold text-gray-900 mb-2">لم تجد إجابة لسؤالك؟</p>
          <p className="text-sm text-gray-500 mb-4">تواصل معنا مباشرة وسنساعدك في أقرب وقت</p>
          <a href="tel:+96200000000" className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors inline-block">
            اتصل بنا
          </a>
        </div>
      </div>
    </div>
  )
}
