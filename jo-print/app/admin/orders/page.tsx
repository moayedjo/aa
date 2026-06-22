'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'
import { ORDER_STATUS_LABELS as statusLabels } from '@/lib/constants'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total: number
  status: string
  delivery_method: string
  payment_method: string
  notes: string | null
  created_at: string
}


export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      setOrders(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId)
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    // Auto-notify on key status changes
    if (['approved', 'ready', 'shipped'].includes(status)) {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, type: status === 'approved' ? 'confirmed' : status }),
      })
    }
    setUpdating(null)
  }

  const sendNotify = async (orderId: string, type: string) => {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, type }),
    })
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة الطلبات</h1>
        <span className="text-sm text-gray-500">{orders.length} طلب إجمالي</span>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[['all', 'الكل'], ...Object.entries(statusLabels)].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === val ? 'bg-primary text-white' : 'bg-white border border-border text-gray-600 hover:bg-surface'}`}
          >{label}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الطلب</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العميل</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الهاتف</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التوصيل</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الدفع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono text-primary font-medium text-xs">{order.order_number}</td>
                  <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs" dir="ltr">{order.customer_phone}</td>
                  <td className="px-4 py-3 font-bold">{Number(order.total).toFixed(3)} د.أ</td>
                  <td className="px-4 py-3 text-xs">{order.delivery_method === 'delivery' ? '🚚 توصيل' : '🏪 استلام'}</td>
                  <td className="px-4 py-3 text-xs">{order.payment_method === 'cash' ? '💵 عند الاستلام' : '💳 بطاقة'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      disabled={updating === order.id}
                      className="border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    >
                      {Object.entries(statusLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString('ar-JO')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => sendNotify(order.id, 'status_update')}
                      title="إرسال إشعار واتساب"
                      className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                    >
                      <MessageCircle size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  <div>لا توجد طلبات</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
