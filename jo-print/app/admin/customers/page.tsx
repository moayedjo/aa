'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, User, Phone, Mail, ShoppingBag } from 'lucide-react'

interface Customer {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string
  created_at: string
  order_count?: number
  total_spent?: number
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = createClient()
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!profiles) { setLoading(false); return }

      const { data: orderAgg } = await supabase
        .from('orders')
        .select('user_id, total')

      const aggMap: Record<string, { count: number; spent: number }> = {}
      for (const o of orderAgg ?? []) {
        if (!o.user_id) continue
        if (!aggMap[o.user_id]) aggMap[o.user_id] = { count: 0, spent: 0 }
        aggMap[o.user_id].count++
        aggMap[o.user_id].spent += Number(o.total ?? 0)
      }

      setCustomers(profiles.map(p => ({
        ...p,
        order_count: aggMap[p.id]?.count ?? 0,
        total_spent: aggMap[p.id]?.spent ?? 0,
      })))
      setLoading(false)
    }
    fetchCustomers()
  }, [])

  const filtered = customers.filter(c =>
    !search ||
    c.full_name?.includes(search) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
        <span className="text-sm text-gray-500">{customers.length} عميل مسجّل</span>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو البريد..."
          className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">لا يوجد عملاء</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">العميل</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium hidden md:table-cell">الهاتف</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium hidden lg:table-cell">البريد</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">الطلبات</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium hidden md:table-cell">الإجمالي</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">الدور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User size={14} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{c.full_name ?? '—'}</div>
                        <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ar-JO')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-primary">
                        <Phone size={12} />{c.phone}
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-gray-600 hover:text-primary">
                        <Mail size={12} /><span className="truncate max-w-[160px]">{c.email}</span>
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <ShoppingBag size={13} className="text-gray-400" />
                      {c.order_count}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-medium text-gray-900">
                    {(c.total_spent ?? 0).toFixed(3)} د.أ
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.role === 'admin' ? 'bg-red-100 text-red-700' :
                      c.role === 'order_manager' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {c.role === 'admin' ? 'مدير' : c.role === 'order_manager' ? 'مشرف طلبات' : 'عميل'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
