'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

const statusSteps = [
  { key: 'received',   label: 'تم استلام الطلب',  icon: '📥', desc: 'تلقينا طلبك بنجاح' },
  { key: 'reviewing',  label: 'مراجعة الملف',      icon: '🔍', desc: 'فريقنا يراجع الملف المرفوع' },
  { key: 'approved',   label: 'تمت الموافقة',      icon: '✅', desc: 'تمت الموافقة على الطلب' },
  { key: 'production', label: 'قيد الإنتاج',       icon: '🖨️', desc: 'جارٍ طباعة طلبك الآن' },
  { key: 'ready',      label: 'جاهز للاستلام',     icon: '📦', desc: 'طلبك جاهز للاستلام أو التوصيل' },
  { key: 'delivered',  label: 'تم التوصيل',        icon: '🎉', desc: 'تم تسليم طلبك بنجاح' },
]

interface OrderData {
  order_number: string
  customer_name: string
  status: string
  total: number
  delivery_method: string
  created_at: string
  order_items: Array<{ product_name: string; quantity: number; unit_price: number }>
}

function TrackContent() {
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (q?: string) => {
    const num = (q ?? query).trim()
    if (!num) return
    setLoading(true); setError(''); setOrder(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(num)}`)
      if (!res.ok) throw new Error('الطلب غير موجود. تحقق من رقم الطلب.')
      setOrder(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال')
    }
    setLoading(false)
  }

  useEffect(() => {
    const q = params.get('q')
    if (q) handleTrack(q)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentStepIndex = order ? statusSteps.findIndex(s => s.key === order.status) : -1

  return (
    <div className="py-10 px-4 min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">تتبع طلبك</h1>
          <p className="text-gray-500">أدخل رقم الطلب لمعرفة حالته الحالية</p>
        </div>

        <div className="flex gap-2 mb-8">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="مثال: JP-20250615-1234"
            className="flex-1 border border-border bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onKeyDown={e => e.key === 'Enter' && handleTrack()}
            dir="ltr"
          />
          <button onClick={() => handleTrack()} disabled={loading}
            className="bg-primary text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Search size={20} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {order && (
          <div className="bg-white border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">رقم الطلب</p>
                <h2 className="font-bold text-gray-900 font-mono text-lg">{order.order_number}</h2>
                <p className="text-sm text-gray-500 mt-1">{order.customer_name} · {new Date(order.created_at).toLocaleDateString('ar-JO')}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 mb-1">الإجمالي</p>
                <p className="font-bold text-primary text-lg">{Number(order.total).toFixed(3)} د.أ</p>
                <p className="text-xs text-gray-500">{order.delivery_method === 'delivery' ? '🚚 توصيل' : '🏪 استلام'}</p>
              </div>
            </div>

            {/* Status timeline */}
            <div className="space-y-1">
              {statusSteps.map((step, index) => {
                const done = index < currentStepIndex
                const current = index === currentStepIndex
                const upcoming = index > currentStepIndex
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 flex-shrink-0 transition-all ${
                        current ? 'border-primary bg-primary/10 shadow-md shadow-primary/20' :
                        done    ? 'border-green-400 bg-green-50' :
                                  'border-gray-200 bg-white'
                      }`}>
                        {done ? '✓' : step.icon}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className={`pt-2 pb-3 ${upcoming ? 'opacity-40' : ''}`}>
                      <p className={`font-semibold text-sm ${current ? 'text-primary' : done ? 'text-green-700' : 'text-gray-600'}`}>
                        {step.label}
                        {current && <span className="mr-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">الحالة الحالية</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Items */}
            {order.order_items?.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">محتويات الطلب</h3>
                <div className="space-y-2">
                  {order.order_items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span className="font-medium">{(Number(item.unit_price) * item.quantity).toFixed(3)} د.أ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <TrackContent />
    </Suspense>
  )
}
