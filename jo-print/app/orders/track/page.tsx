'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

const statusSteps = [
  { key: 'received', label: 'تم استلام الطلب', icon: '📥', desc: 'تلقينا طلبك بنجاح' },
  { key: 'reviewing', label: 'مراجعة الملف', icon: '🔍', desc: 'فريقنا يراجع الملف المرفوع' },
  { key: 'approved', label: 'تمت الموافقة', icon: '✅', desc: 'تمت الموافقة على الطلب' },
  { key: 'production', label: 'قيد الإنتاج', icon: '🖨️', desc: 'جارٍ طباعة طلبك الآن' },
  { key: 'ready', label: 'جاهز للاستلام', icon: '📦', desc: 'طلبك جاهز للاستلام أو التوصيل' },
  { key: 'delivered', label: 'تم التوصيل', icon: '🎉', desc: 'تم تسليم طلبك بنجاح' },
]

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [tracked, setTracked] = useState(false)
  const currentStep = 3 // production

  const handleTrack = () => {
    if (orderNumber.trim()) setTracked(true)
  }

  return (
    <div className="py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">تتبع طلبك</h1>
          <p className="text-gray-500">أدخل رقم طلبك لمعرفة حالته</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <input
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            placeholder="مثال: JO-2025-00847"
            className="flex-1 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={e => e.key === 'Enter' && handleTrack()}
          />
          <button
            onClick={handleTrack}
            className="bg-primary text-white px-5 py-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Search size={18} />
          </button>
        </div>

        {tracked && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-gray-900">طلب #{orderNumber}</h2>
                <p className="text-sm text-gray-500">آخر تحديث: اليوم الساعة 2:30 م</p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                قيد الإنتاج
              </span>
            </div>

            {/* Timeline */}
            <div className="space-y-0">
              {statusSteps.map((step, index) => {
                const isDone = index <= currentStep
                const isCurrent = index === currentStep
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                        isDone ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                        {isDone ? step.icon : '○'}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${index < currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="pb-8 pt-1">
                      <p className={`font-semibold ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                      <p className={`text-sm ${isDone ? 'text-gray-500' : 'text-gray-300'}`}>{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
