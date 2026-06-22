'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import type { PrintShop } from '@/lib/types'
import { Plus, Edit2, Trash2, X, Star, MapPin, Phone, Clock } from 'lucide-react'

const ALL_SERVICES = ['طباعة وثائق', 'بطاقات عمل', 'بانرات', 'تصميم', 'تصوير', 'تجليد', 'لاميناتور', 'بروشورات', 'ملصقات', 'فلايرات', 'هدايا مطبوعة']
const AREAS = ['عمان', 'الزرقاء', 'إربد', 'عجلون', 'جرش', 'المفرق', 'الكرك', 'مأدبا', 'العقبة', 'السلط']

const empty: Omit<PrintShop, 'id'> = {
  name: '', address: '', area: 'عمان', phone: '', hours: '8:00 ص - 9:00 م', rating: 4.5, services: [],
}

export default function AdminShops() {
  const [shops, setShops] = useState<PrintShop[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; editing: PrintShop | null }>({ open: false, editing: null })
  const [form, setForm] = useState<Omit<PrintShop, 'id'>>(empty)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/shops').then(r => r.json()).then(data => {
      setShops((data ?? []).map((s: Record<string, unknown>) => ({
        id: s.id, name: s.name, address: s.address, area: s.area,
        phone: s.phone, hours: s.hours as string ?? '', rating: Number(s.rating),
        services: s.services as string[] ?? [],
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openAdd = () => { setForm(empty); setModal({ open: true, editing: null }) }
  const openEdit = (s: PrintShop) => { const { id, ...rest } = s; void id; setForm(rest); setModal({ open: true, editing: s }) }
  const close = () => setModal({ open: false, editing: null })

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (modal.editing) {
      const res = await fetch(`/api/admin/shops/${modal.editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) setShops(prev => prev.map(s => s.id === modal.editing!.id ? { ...form, id: modal.editing!.id } : s))
    } else {
      const res = await fetch('/api/admin/shops', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) { const created = await res.json(); setShops(prev => [{ ...form, id: created.id }, ...prev]) }
    }
    setSaving(false); close()
  }

  const del = async (id: string) => {
    await fetch(`/api/admin/shops/${id}`, { method: 'DELETE' })
    setShops(prev => prev.filter(s => s.id !== id))
    setDeleteConfirm(null)
  }

  const upd = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [f]: f === 'rating' ? Number(e.target.value) : e.target.value }))

  const toggleService = (s: string) =>
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(s) ? prev.services.filter(x => x !== s) : [...prev.services, s],
    }))

  const filtered = shops.filter(s =>
    !search || s.name.includes(search) || s.area.includes(search) || s.address.includes(search)
  )

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">مكاتب الطباعة</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />إضافة مكتب
        </button>
      </div>

      <div className="mb-5">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو المنطقة أو العنوان..." className={inp} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(shop => (
          <div key={shop.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-900">{shop.name}</h3>
              <div className="flex items-center gap-0.5 text-amber-500">
                <Star size={13} fill="currentColor" />
                <span className="text-gray-700 font-medium text-sm">{shop.rating}</span>
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs">{shop.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                <a href={`tel:${shop.phone}`} className="text-xs hover:text-primary" dir="ltr">{shop.phone}</a>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs">{shop.hours}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {shop.services.slice(0, 3).map(s => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
              {shop.services.length > 3 && (
                <span className="text-xs text-gray-400">+{shop.services.length - 3} أخرى</span>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => openEdit(shop)} className="flex-1 flex items-center justify-center gap-1 border border-gray-200 py-1.5 rounded-lg text-xs text-gray-600 hover:border-primary hover:text-primary transition-colors">
                <Edit2 size={12} />تعديل
              </button>
              <button onClick={() => setDeleteConfirm(shop.id)} className="flex-1 flex items-center justify-center gap-1 border border-gray-200 py-1.5 rounded-lg text-xs text-gray-600 hover:border-red-400 hover:text-red-500 transition-colors">
                <Trash2 size={12} />حذف
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">لا توجد نتائج</div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{modal.editing ? 'تعديل مكتب' : 'إضافة مكتب جديد'}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={lbl}>اسم المكتب *</label>
                <input type="text" value={form.name} onChange={upd('name')} className={inp} placeholder="مطبعة النور" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>المنطقة</label>
                  <select value={form.area} onChange={upd('area')} className={inp}>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>رقم الهاتف</label>
                  <input type="tel" value={form.phone} onChange={upd('phone')} className={inp} placeholder="079XXXXXXX" dir="ltr" />
                </div>
              </div>

              <div>
                <label className={lbl}>العنوان التفصيلي</label>
                <input type="text" value={form.address} onChange={upd('address')} className={inp} placeholder="شارع الرينبو، الجبيهة" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>أوقات العمل</label>
                  <input type="text" value={form.hours} onChange={upd('hours')} className={inp} placeholder="8:00 ص - 9:00 م" />
                </div>
                <div>
                  <label className={lbl}>التقييم (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={upd('rating')} className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>الخدمات المتاحة</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ALL_SERVICES.map(s => (
                    <button key={s} type="button" onClick={() => toggleService(s)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.services.includes(s) ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={close} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">إلغاء</button>
              <button onClick={save} disabled={!form.name.trim() || saving} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : modal.editing ? 'حفظ' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-2">حذف المكتب؟</h3>
            <p className="text-sm text-gray-500 mb-5">لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={() => del(deleteConfirm)} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
