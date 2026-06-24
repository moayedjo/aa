'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, CheckCircle, X } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import { addToCart } from '@/lib/cart'

interface Book {
  id: string
  title: string
  subject: string
  grade: string
  description: string
  price: number
  pages: number
  ministry_approved?: boolean
}

const SCHOOL_SUBJECTS = ['رياضيات', 'علوم', 'عربي', 'إنجليزي', 'تربية', 'فيزياء', 'كيمياء', 'أحياء', 'تاريخ', 'جغرافيا']
const isSchoolSubject = (subject: string) => SCHOOL_SUBJECTS.some(s => subject.includes(s))

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('الكل')
  const [grade, setGrade] = useState('الكل')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        setBooks((data ?? []).map(b => ({
          id: b.id as string,
          title: b.title as string,
          subject: b.subject as string,
          grade: b.grade as string,
          description: b.description as string ?? '',
          price: Number(b.price),
          pages: Number(b.pages ?? 0),
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const subjects = ['الكل', ...Array.from(new Set(books.map(b => b.subject)))]
  const grades = ['الكل', ...Array.from(new Set(books.map(b => b.grade)))]

  const handleOrder = (book: Book) => {
    addToCart({ productId: book.id, name: book.title, price: book.price, quantity: 1, type: 'book' })
    window.dispatchEvent(new Event('cart-updated'))
    showToast(book.title)
  }

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q)
    const matchSubject = subject === 'الكل' || b.subject === subject
    const matchGrade = grade === 'الكل' || b.grade === grade
    return matchSearch && matchSubject && matchGrade
  })

  return (
    <div className="py-10 px-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle size={18} className="text-green-400 shrink-0" />
          <div className="text-sm">
            <span className="font-medium">تمت الإضافة للسلة</span>
            <span className="text-gray-400 mx-1">·</span>
            <span className="text-gray-300 truncate max-w-[150px] inline-block align-bottom">{toast}</span>
          </div>
          <Link href="/cart" className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
            عرض السلة
          </Link>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">ملخصات الكتب</h1>
          <p className="text-gray-500">ملخصات منهجية شاملة لجميع المراحل الدراسية في الأردن</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن ملخص..."
                className="w-full border border-border rounded-lg pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              {grades.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p>{books.length === 0 ? 'لا توجد ملخصات متاحة حالياً' : 'لا توجد نتائج تطابق البحث'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(book => (
              <div key={book.id} className="bg-white border border-border rounded-[12px] p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-2xl shrink-0">📚</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-0.5">{book.title}</h3>
                    <div className="flex gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{book.subject}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{book.grade}</span>
                    </div>
                  </div>
                </div>
                {(book.ministry_approved || isSchoolSubject(book.subject)) && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                    <span>✓</span> معتمد وزارة التربية
                  </span>
                )}
                <p className="text-sm text-gray-500 mb-3">{book.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <span className="font-bold text-primary">{formatPrice(book.price)}</span>
                    <span className="text-xs text-gray-400 mr-1">({book.pages} صفحة)</span>
                  </div>
                  <button onClick={() => handleOrder(book)} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    اطلب الآن
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

