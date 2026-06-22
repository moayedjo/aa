'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { teachers as initialTeachers } from '@/lib/data/teachers'
import type { Teacher } from '@/lib/types'
import { Plus, Edit2, Trash2, X, Star, GraduationCap } from 'lucide-react'

const ALL_SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'لغة عربية', 'لغة إنجليزية', 'تاريخ', 'جغرافيا', 'تربية إسلامية', 'علوم', 'معلوماتية', 'اقتصاد']

const empty: Omit<Teacher, 'id'> = {
  name: '', subjects: [], experience: 1, rating: 4.5,
  ratePerHour: 10, location: '', available: true, bio: '',
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)
  const [modal, setModal] = useState<{ open: boolean; editing: Teacher | null }>({ open: false, editing: null })
  const [form, setForm] = useState<Omit<Teacher, 'id'>>(empty)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const openAdd = () => { setForm(empty); setModal({ open: true, editing: null }) }
  const openEdit = (t: Teacher) => { const { id, ...rest } = t; void id; setForm(rest); setModal({ open: true, editing: t }) }
  const close = () => setModal({ open: false, editing: null })

  const save = () => {
    if (!form.name.trim()) return
    if (modal.editing) {
      setTeachers(prev => prev.map(t => t.id === modal.editing!.id ? { ...form, id: modal.editing!.id } : t))
    } else {
      setTeachers(prev => [...prev, { ...form, id: `t-${Date.now()}` }])
    }
    close()
  }

  const del = (id: string) => { setTeachers(prev => prev.filter(t => t.id !== id)); setDeleteConfirm(null) }

  const upd = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: ['experience', 'rating', 'ratePerHour'].includes(f) ? Number(e.target.value) : e.target.value }))

  const toggleSubject = (s: string) =>
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(s) ? prev.subjects.filter(x => x !== s) : [...prev.subjects, s],
    }))

  const filtered = teachers.filter(t =>
    !search || t.name.includes(search) || t.subjects.some(s => s.includes(search)) || t.location.includes(search)
  )

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">المعلمون</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />إضافة معلم
        </button>
      </div>

      <div className="mb-5">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو المادة أو الموقع..." className={inp} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <GraduationCap size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.location}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.available ? 'متاح' : 'غير متاح'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {t.subjects.map(s => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={13} fill="currentColor" />
                <span className="font-medium text-gray-700">{t.rating}</span>
                <span className="text-gray-400">· {t.experience} سنوات</span>
              </div>
              <span className="font-bold text-primary">{t.ratePerHour.toFixed(3)} د.أ/ساعة</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => openEdit(t)} className="flex-1 flex items-center justify-center gap-1 border border-gray-200 py-1.5 rounded-lg text-xs text-gray-600 hover:border-primary hover:text-primary transition-colors">
                <Edit2 size={12} />تعديل
              </button>
              <button onClick={() => setDeleteConfirm(t.id)} className="flex-1 flex items-center justify-center gap-1 border border-gray-200 py-1.5 rounded-lg text-xs text-gray-600 hover:border-red-400 hover:text-red-500 transition-colors">
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
              <h2 className="font-bold text-gray-900 text-lg">{modal.editing ? 'تعديل معلم' : 'إضافة معلم جديد'}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={lbl}>الاسم *</label>
                <input type="text" value={form.name} onChange={upd('name')} className={inp} placeholder="أ. محمد العمري" />
              </div>

              <div>
                <label className={lbl}>المواد التي يدرّسها</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ALL_SUBJECTS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSubject(s)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.subjects.includes(s) ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>سنوات الخبرة</label>
                  <input type="number" min="0" value={form.experience} onChange={upd('experience')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>التقييم (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={upd('rating')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>السعر/ساعة (د.أ)</label>
                  <input type="number" step="0.5" min="0" value={form.ratePerHour} onChange={upd('ratePerHour')} className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>الموقع</label>
                <input type="text" value={form.location} onChange={upd('location')} className={inp} placeholder="عمان - الجبيهة" />
              </div>

              <div>
                <label className={lbl}>نبذة مختصرة</label>
                <textarea value={form.bio} onChange={upd('bio')} rows={2} className={inp + ' resize-none'} placeholder="نبذة عن المعلم وتخصصه..." />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.available}
                  onChange={e => setForm(prev => ({ ...prev, available: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm font-medium text-gray-700">متاح للحجز حالياً</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={close} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">إلغاء</button>
              <button onClick={save} disabled={!form.name.trim()} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {modal.editing ? 'حفظ' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-2">حذف المعلم؟</h3>
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
