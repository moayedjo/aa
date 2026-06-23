'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import type { Product, ProductOption } from '@/lib/types'
import { X, Plus, Edit2, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'

const CATEGORIES = [
  { value: 'printing', label: 'طباعة' },
  { value: 'large-format', label: 'طباعة كبيرة' },
  { value: 'store', label: 'متجر' },
]

const ICONS = ['📄', '💼', '🏷️', '🎌', '📓', '👕', '☕', '📢', '🎓', '🏆', '💌', '🖼️', '📦', '🖨️', '🗂️']

const emptyProduct: Omit<Product, 'id'> = {
  name: '', nameEn: '', category: 'printing', price: 0,
  priceUnit: 'للقطعة', description: '', icon: '📄', color: '#1E88E5', popular: false, options: [],
}

const emptyOption: ProductOption = { name: '', label: '', values: [] }

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null })
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newOptionValue, setNewOptionValue] = useState<Record<number, string>>({})
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then(data => {
      setProducts((data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id, name: p.name, nameEn: p.name_en ?? '', category: p.category,
        price: Number(p.price), priceUnit: p.price_unit ?? 'للقطعة',
        description: p.description ?? '', icon: p.icon ?? '📦', color: p.color ?? '#1E88E5',
        popular: p.popular ?? false, options: (p.options as ProductOption[]) ?? [],
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openAdd = () => { setForm(emptyProduct); setNewOptionValue({}); setModal({ open: true, editing: null }) }
  const openEdit = (p: Product) => {
    const { id: _id, ...rest } = p
    setForm({ ...rest, options: rest.options ?? [] })
    setNewOptionValue({})
    setModal({ open: true, editing: p })
  }
  const closeModal = () => setModal({ open: false, editing: null })

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    setSaveError('')
    try {
      if (modal.editing) {
        const res = await fetch(`/api/admin/products/${modal.editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'فشل الحفظ') }
        setProducts(prev => prev.map(p => p.id === modal.editing!.id ? { ...form, id: modal.editing!.id } : p))
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'فشل الإضافة') }
        const created = await res.json()
        setProducts(prev => [{ ...form, id: created.id }, ...prev])
      }
      closeModal()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id))
    } else {
      alert('فشل حذف المنتج — يرجى المحاولة مجدداً')
    }
    setDeleteConfirm(null)
  }

  const upd = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: field === 'price' ? Number(e.target.value) : e.target.value }))

  // Options management
  const addOption = () =>
    setForm(prev => ({ ...prev, options: [...(prev.options ?? []), { ...emptyOption }] }))

  const removeOption = (i: number) =>
    setForm(prev => ({ ...prev, options: (prev.options ?? []).filter((_, idx) => idx !== i) }))

  const updateOption = (i: number, field: keyof ProductOption, val: string) =>
    setForm(prev => {
      const opts = [...(prev.options ?? [])]
      opts[i] = { ...opts[i], [field]: val }
      return { ...prev, options: opts }
    })

  const addOptionValue = (i: number) => {
    const val = (newOptionValue[i] ?? '').trim()
    if (!val) return
    setForm(prev => {
      const opts = [...(prev.options ?? [])]
      opts[i] = { ...opts[i], values: [...opts[i].values, val] }
      return { ...prev, options: opts }
    })
    setNewOptionValue(prev => ({ ...prev, [i]: '' }))
  }

  const removeOptionValue = (optIdx: number, valIdx: number) =>
    setForm(prev => {
      const opts = [...(prev.options ?? [])]
      opts[optIdx] = { ...opts[optIdx], values: opts[optIdx].values.filter((_, i) => i !== valIdx) }
      return { ...prev, options: opts }
    })

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة المنتجات</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />إضافة منتج
        </button>
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ backgroundColor: product.color + '22' }}>
              {product.icon}
            </div>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-gray-900">{product.name}</h3>
              {product.popular && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">شائع</span>}
            </div>
            <p className="text-xs text-gray-500 mb-1">{CATEGORIES.find(c => c.value === product.category)?.label}</p>
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.description}</p>
            {(product.options ?? []).length > 0 && (
              <p className="text-xs text-blue-500 mb-2">{product.options!.length} خيارات</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold text-sm">من {formatPrice(product.price)} {product.priceUnit}</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(product)} className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteConfirm(product.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{modal.editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>اسم المنتج (عربي) *</label>
                  <input type="text" value={form.name} onChange={upd('name')} className={inputClass} placeholder="بطاقات عمل" />
                </div>
                <div>
                  <label className={labelClass}>اسم المنتج (إنجليزي)</label>
                  <input type="text" value={form.nameEn} onChange={upd('nameEn')} className={inputClass} placeholder="Business Cards" dir="ltr" />
                </div>
              </div>

              <div>
                <label className={labelClass}>الوصف</label>
                <textarea value={form.description} onChange={upd('description')} rows={2}
                  className={inputClass + ' resize-none'} placeholder="وصف المنتج..." />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>التصنيف</label>
                  <select value={form.category} onChange={upd('category')} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>السعر (د.أ)</label>
                  <input type="number" step="0.001" min="0" value={form.price} onChange={upd('price')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>وحدة السعر</label>
                  <input type="text" value={form.priceUnit} onChange={upd('priceUnit')} className={inputClass} placeholder="للقطعة" />
                </div>
              </div>

              <div>
                <label className={labelClass}>الأيقونة</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(prev => ({ ...prev, icon }))}
                      className={`w-10 h-10 rounded-lg text-xl border-2 transition-colors ${form.icon === icon ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>اللون</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={upd('color')}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                    <input type="text" value={form.color} onChange={upd('color')} className={inputClass} dir="ltr" />
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.popular ?? false}
                      onChange={e => setForm(prev => ({ ...prev, popular: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary" />
                    <span className="text-sm font-medium text-gray-700">منتج شائع</span>
                  </label>
                </div>
              </div>

              {/* Product Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + ' mb-0'}>خيارات المنتج</label>
                  <button type="button" onClick={addOption}
                    className="flex items-center gap-1 text-xs text-primary hover:text-blue-700 font-medium">
                    <Plus size={13} />إضافة خيار
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.options ?? []).map((opt, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text" value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)}
                          className={inputClass} placeholder="اسم الخيار (key) مثال: size" dir="ltr"
                        />
                        <input
                          type="text" value={opt.label} onChange={e => updateOption(i, 'label', e.target.value)}
                          className={inputClass} placeholder="العنوان مثال: المقاس"
                        />
                        <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.values.map((val, vi) => (
                          <span key={vi} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                            {val}
                            <button type="button" onClick={() => removeOptionValue(i, vi)} className="text-gray-400 hover:text-red-500">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newOptionValue[i] ?? ''}
                          onChange={e => setNewOptionValue(prev => ({ ...prev, [i]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOptionValue(i))}
                          className={inputClass} placeholder="أضف قيمة..."
                        />
                        <button type="button" onClick={() => addOptionValue(i)}
                          className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700">
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                  {(form.options ?? []).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">لا توجد خيارات — اضغط "إضافة خيار" لإضافة خيار مثل المقاس أو اللون</p>
                  )}
                </div>
              </div>
            </div>

            {saveError && (
              <div className="mx-5 mb-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
            )}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : modal.editing ? 'حفظ التغييرات' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-2">حذف المنتج؟</h3>
            <p className="text-sm text-gray-500 mb-5">لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
