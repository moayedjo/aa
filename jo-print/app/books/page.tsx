'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { books } from '@/lib/data/books'
import { Search } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import { addToCart } from '@/lib/cart'

const subjects = ['الكل', 'رياضيات', 'لغة عربية', 'لغة إنجليزية', 'علوم', 'فيزياء', 'كيمياء']
const grades = ['الكل', 'الصف التاسع', 'الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر']

export default function BooksPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('الكل')
  const [grade, setGrade] = useState('الكل')

  const handleOrder = (book: typeof books[number]) => {
    addToCart({ productId: book.id, name: book.title, price: book.price, quantity: 1, type: 'book' })
    window.dispatchEvent(new Event('cart-updated'))
    router.push('/cart')
  }

  const filtered = books.filter(b => {
    const matchSearch = b.title.includes(search) || b.subject.includes(search)
    const matchSubject = subject === 'الكل' || b.subject === subject
    const matchGrade = grade === 'الكل' || b.grade === grade
    return matchSearch && matchSubject && matchGrade
  })

  return (
    <div className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">ملخصات الكتب</h1>
          <p className="text-gray-500">ملخصات منهجية شاملة لجميع المراحل الدراسية في الأردن</p>
        </div>

        {/* Filters */}
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

        {/* Books Grid */}
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
      </div>
    </div>
  )
}
