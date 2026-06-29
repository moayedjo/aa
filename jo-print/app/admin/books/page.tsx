'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import type { Book } from '@/lib/types'
import { Plus, Edit2, Trash2, X, BookOpen } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'

const SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'لغة عربية', 'لغة إنجليزية', 'تاريخ', 'جغرافيا', 'تربية إسلامية', 'علوم', 'معلوماتية', 'اقتصاد']
const GRADES = ['الصف السابع', 'الصف الثامن', 'الصف التاسع', 'الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر', 'جامعي']

const empty: Omit<Book, 'id'> = { title: '', subject: 'رياضيات', grade: 'الصف العاشر', price: 2.5, pages: 40, description: '' }

export default function AdminBooks() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; editing: Book | null }>({ open: false, editing: null })
  const [form, setForm] = useState<Omit<Book, 'id'>>(empty)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/admin/books').then(r => r.json()).then(data => {
      setBooks((data ?? []).map((b: Record<string, unknown>) => ({
        id: b.id, title: b.title, subject: b.subject, grade: b.grade,
        price: Number(b.price), pages: Number(b.pages ?? 0), description: b.description ?? '',
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openAdd = () => { setForm(empty); setModal({ open: true, editing: null }) }
  const openEdit = (b: Book) => { const { id: _id, ...rest } = b; setForm(rest); setModal({ open: true, editing: b }) }
  const close = () => { setModal({ open: false, editing: null }); setSaveError('') }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true); setSaveError('')
    try {
      if (modal.editing) {
        const res = await fetch(`/api/admin/books/${modal.editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'فشل الحفظ') }
        setBooks(prev => prev.map(b => b.id === modal.editing!.id ? { ...form, id: modal.editing!.id } : b))
      } else {
        const res = await fetch('/api/admin/books', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'فشل الإضافة') }
        const created = await res.json(); setBooks(prev => [{ ...form, id: created.id }, ...prev])
      }
      close()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    const res = await fetch(`/api/admin/books/${id}`, { method: 'DELETE' })
    if (res.ok) setBooks(prev => prev.filter(b => b.id !== id))
    else alert('فشل الحذف — يرجى المحاولة مجدداً')
    setDeleteConfirm(null)
  }

  const upd = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: ['price', 'pages'].includes(f) ? Number(e.target.value) : e.target.value }))

  const filtered = books.filter(b => !search || b.title.includes(search) || b.subject.includes(search) || b.grade.includes(search))

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ملخصات الكتب</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />إضافة ملخص
        </button>
      </div>

      <div className="mb-5">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالعنوان أو المادة أو الصف..." className={inp} />
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">العنوان</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium hidden md:table-cell">المادة</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium hidden md:table-cell">الصف</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">الصفحات</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">السعر</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen size={14} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-xs leading-tight">{b.title}</div>
                      <div className="text-xs text-gray-400 md:hidden">{b.subject} — {b.grade}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{b.subject}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{b.grade}</td>
                <td className="px-4 py-3 text-gray-600">{b.pages} صفحة</td>
                <td className="px-4 py-3 font-bold text-primary">{formatPrice(b.price)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">لا توجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{modal.editing ? 'تعديل الملخص' : 'إضافة ملخص جديد'}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={lbl}>عنوان الملخص *</label>
                <input type="text" value={form.title} onChange={upd('title')} className={inp} placeholder="ملخص الرياضيات - الصف العاشر" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>المادة</label>
                  <select value={form.subject} onChange={upd('subject')} className={inp}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>الصف</label>
                  <select value={form.grade} onChange={upd('grade')} className={inp}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>السعر (د.أ)</label>
                  <input type="number" step="0.25" min="0" value={form.price} onChange={upd('price')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>عدد الصفحات</label>
                  <input type="number" min="1" value={form.pages} onChange={upd('pages')} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>الوصف</label>
                <textarea value={form.description} onChange={upd('description')} rows={3} className={inp + ' resize-none'} placeholder="وصف مختصر للملخص..." />
              </div>
            </div>
            {saveError && <div className="mx-5 mb-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={close} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">إلغاء</button>
              <button onClick={save} disabled={!form.title.trim() || saving} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
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
            <h3 className="font-bold text-gray-900 mb-2">حذف الملخص؟</h3>
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
