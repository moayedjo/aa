'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/constants'

interface Order {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

interface Stats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
}

const statusLabels = ORDER_STATUS_LABELS
const statusColors = ORDER_STATUS_COLORS

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total, status, created_at')
        .order('created_at', { ascending: false })
      if (orders) {
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => ['received','reviewing','approved','production'].includes(o.status)).length,
          completedOrders: orders.filter(o => o.status === 'delivered').length,
          totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
        })
        setRecentOrders(orders.slice(0, 10))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'إجمالي الطلبات', value: stats.totalOrders.toString(), icon: '📦', color: 'text-blue-600' },
          { label: 'طلبات معلقة', value: stats.pendingOrders.toString(), icon: '⏳', color: 'text-yellow-600' },
          { label: 'طلبات مكتملة', value: stats.completedOrders.toString(), icon: '✅', color: 'text-green-600' },
          { label: 'إجمالي الإيرادات', value: `${stats.totalRevenue.toFixed(3)} د.أ`, icon: '💰', color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color} mb-1`}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/admin/orders', label: 'إدارة الطلبات', icon: '📦', desc: 'عرض وتحديث حالة الطلبات' },
          { href: '/admin/files', label: 'مراجعة الملفات', icon: '📁', desc: 'مراجعة ملفات الطباعة المرفوعة' },
          { href: '/admin/products', label: 'إدارة المنتجات', icon: '🛍️', desc: 'إضافة وتعديل المنتجات' },
        ].map(action => (
          <Link key={action.href} href={action.href} className="bg-white rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-bold text-gray-900 mb-1">{action.label}</div>
            <div className="text-sm text-gray-500">{action.desc}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-gray-900">آخر الطلبات</h2>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">عرض الكل</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الطلب</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العميل</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono font-medium text-primary text-xs">{order.order_number}</td>
                  <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                  <td className="px-4 py-3 font-bold">{Number(order.total).toFixed(3)} د.أ</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString('ar-JO')}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    <div className="text-3xl mb-2">📭</div>
                    <div>لا توجد طلبات بعد</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
