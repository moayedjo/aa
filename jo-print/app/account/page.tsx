'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, User, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/pricing'

interface Profile { id: string; full_name: string | null; phone: string | null; address: string | null; role: string }
interface Order { id: string; order_number: string; status: string; total: number; created_at: string }

const statusLabels: Record<string, string> = {
  received: 'استُلم', reviewing: 'قيد المراجعة', approved: 'موافق عليه',
  production: 'في الإنتاج', ready: 'جاهز', delivered: 'تم التوصيل', cancelled: 'ملغي',
}
const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700', reviewing: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700', production: 'bg-purple-100 text-purple-700',
  ready: 'bg-teal-100 text-teal-700', delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AccountPage() {
  const router = useRouter()
  const [tab, setTab] = useState('orders')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', address: '' })
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: profileData }, { data: ordersData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('id, order_number, status, total, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (profileData) {
        setProfile(profileData)
        setEditForm({ fullName: profileData.full_name ?? '', phone: profileData.phone ?? '', address: profileData.address ?? '' })
      }
      setOrders(ordersData ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: editForm.fullName, phone: editForm.phone, address: editForm.address }),
    })
    if (res.ok) {
      setSaveMsg('تم حفظ التغييرات بنجاح ✓')
      setTimeout(() => setSaveMsg(''), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="py-20 flex justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const inputClass = 'w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="py-10 px-4 bg-surface min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">حسابي</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className="bg-white border border-border rounded-xl p-4 h-fit">
            <div className="text-center pb-4 mb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">👤</div>
              <p className="font-bold text-gray-900">{profile?.full_name ?? 'مستخدم'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{profile?.role === 'admin' ? '⚡ مدير' : 'عميل'}</p>
            </div>
            <nav className="space-y-0.5">
              {[
                { key: 'orders', label: 'طلباتي', icon: <Package size={15} /> },
                { key: 'profile', label: 'الملف الشخصي', icon: <User size={15} /> },
                { key: 'settings', label: 'الإعدادات', icon: <Settings size={15} /> },
              ].map(item => (
                <button key={item.key} onClick={() => setTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-right font-medium ${
                    tab === item.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface'
                  }`}>
                  {item.icon}{item.label}
                </button>
              ))}
              {profile?.role === 'admin' && (
                <Link href="/admin" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/5 font-medium">
                  ⚡ لوحة الإدارة
                </Link>
              )}
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 font-medium mt-1">
                <LogOut size={15} />تسجيل الخروج
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {tab === 'orders' && (
              <div>
                <h2 className="font-bold text-xl text-gray-900 mb-4">طلباتي ({orders.length})</h2>
                {orders.length === 0 ? (
                  <div className="bg-white border border-border rounded-xl p-10 text-center text-gray-400">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="font-medium">لا توجد طلبات بعد</p>
                    <Link href="/store" className="text-primary hover:underline text-sm mt-2 inline-block">ابدأ التسوق</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-mono font-bold text-sm text-gray-900">{order.order_number}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('ar-JO')}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[order.status] ?? order.status}
                        </span>
                        <p className="font-bold text-primary">{formatPrice(Number(order.total))}</p>
                        <Link href={`/orders/track?q=${order.order_number}`}
                          className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                          تتبع
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <div className="bg-white border border-border rounded-xl p-6">
                <h2 className="font-bold text-xl text-gray-900 mb-5">الملف الشخصي</h2>
                {saveMsg && (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm mb-4">{saveMsg}</div>
                )}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل</label>
                    <input type="text" value={editForm.fullName} onChange={e => setEditForm(f => ({...f, fullName: e.target.value}))} className={inputClass} placeholder="اسمك الكامل" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
                    <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} className={inputClass} placeholder="07XXXXXXXX" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان</label>
                    <input type="text" value={editForm.address} onChange={e => setEditForm(f => ({...f, address: e.target.value}))} className={inputClass} placeholder="عنوانك الكامل" />
                  </div>
                  <button type="submit" disabled={saving}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
                    {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'settings' && (
              <div className="bg-white border border-border rounded-xl p-6">
                <h2 className="font-bold text-xl text-gray-900 mb-5">الإعدادات</h2>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <span>تغيير كلمة المرور</span>
                    <button className="text-primary hover:underline text-sm">تغيير</button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-red-100 bg-red-50 rounded-xl">
                    <span className="text-red-600">حذف الحساب</span>
                    <button className="text-red-500 hover:underline text-sm">حذف</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
