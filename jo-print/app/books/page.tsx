'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Star, BookOpen, Download, ShoppingCart, Heart, Filter, X, ChevronDown, Tag } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import { addToCart } from '@/lib/cart'

interface Book {
  id: string
  title: string
  subject: string
  grade: string
  price: number
  discount_price?: number
  pages: number
  description: string
  cover_url?: string
  rating?: number
  rating_count?: number
  sales_count?: number
  language?: string
  semester?: string
  university?: string
  faculty?: string
  specialization?: string
  level?: 'school' | 'tawjihi' | 'university'
  includes_questions?: boolean
  includes_answers?: boolean
  includes_exams?: boolean
  has_print_version?: boolean
  badge?: 'bestseller' | 'new' | 'recommended' | 'discount' | 'tawjihi'
  author?: string
  is_featured?: boolean
}

type Tab = 'all' | 'school' | 'tawjihi' | 'university' | 'bestseller' | 'new' | 'discount'

const TAB_LABELS: Record<Tab, string> = {
  all: 'الكل',
  school: 'مدرسية',
  tawjihi: 'توجيهي',
  university: 'جامعية',
  bestseller: 'الأكثر مبيعاً',
  new: 'أحدث الملخصات',
  discount: 'العروض',
}

const BADGE_STYLE: Record<string, string> = {
  bestseller: 'bg-orange-100 text-orange-700 border-orange-200',
  new:        'bg-green-100 text-green-700 border-green-200',
  recommended:'bg-blue-100 text-blue-700 border-blue-200',
  discount:   'bg-red-100 text-red-700 border-red-200',
  tawjihi:    'bg-purple-100 text-purple-700 border-purple-200',
}
const BADGE_LABEL: Record<string, string> = {
  bestseller: '🔥 الأكثر مبيعاً',
  new:        '✨ جديد',
  recommended:'⭐ موصى به',
  discount:   '🏷️ خصم',
  tawjihi:    '🎓 توجيهي',
}

function StarRow({ rating = 5, count }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} className={i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
      <span className="text-xs text-gray-500 mr-0.5">{rating?.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
    </div>
  )
}

function BookCover({ book }: { book: Book }) {
  const colors = ['bg-blue-50','bg-purple-50','bg-green-50','bg-orange-50','bg-pink-50','bg-teal-50']
  const color = colors[book.title.charCodeAt(0) % colors.length]
  return (
    <div className={`w-full aspect-[3/4] rounded-lg flex flex-col items-center justify-center ${color} relative overflow-hidden`}>
      {book.cover_url
        ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        : <>
            <BookOpen size={32} className="text-gray-300 mb-2" />
            <span className="text-xs text-gray-400 px-2 text-center font-medium leading-tight">{book.subject}</span>
          </>
      }
      {book.badge && (
        <span className={`absolute top-2 right-2 text-xs border px-1.5 py-0.5 rounded-full font-medium ${BADGE_STYLE[book.badge]}`}>
          {BADGE_LABEL[book.badge]}
        </span>
      )}
    </div>
  )
}

function BookCard({ book, onAddToCart }: { book: Book; onAddToCart: (b: Book) => void }) {
  const [fav, setFav] = useState(false)
  const actualPrice = book.discount_price ?? book.price
  const hasDiscount = book.discount_price && book.discount_price < book.price
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all group flex flex-col">
      <div className="relative p-3 pb-0">
        <BookCover book={book} />
        <button onClick={() => setFav(f => !f)}
          className="absolute top-5 left-5 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center transition-colors">
          <Heart size={14} className={fav ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
        </button>
      </div>
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{book.subject}</span>
          {book.level === 'university'
            ? book.university && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full truncate max-w-[90px]">{book.university}</span>
            : <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{book.grade}</span>
          }
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{book.title}</h3>
        {book.author && <p className="text-xs text-gray-400">{book.author}</p>}
        <StarRow rating={book.rating} count={book.rating_count} />
        <div className="flex gap-2 text-xs text-gray-400">
          <span>{book.pages} صفحة</span>
          {book.language && book.language !== 'ar' && <span>· EN</span>}
          {book.includes_questions && <span>· أسئلة</span>}
        </div>
        <div className="flex items-center gap-2 mt-auto pt-1">
          <div>
            <span className="font-bold text-primary">{formatPrice(actualPrice)}</span>
            {hasDiscount && <span className="text-xs text-gray-400 line-through mr-1">{formatPrice(book.price)}</span>}
          </div>
          {hasDiscount && (
            <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
              {Math.round((1 - actualPrice / book.price) * 100)}%
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <Link href={`/books/${book.id}`}
            className="flex-1 border border-primary text-primary py-1.5 rounded-lg text-xs font-medium text-center hover:bg-primary/5 transition-colors">
            عرض التفاصيل
          </Link>
          <button onClick={() => onAddToCart(book)}
            className="flex-1 bg-primary text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
            <ShoppingCart size={12} /> أضف للسلة
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [toast, setToast] = useState('')

  // Filters
  const [fSubject, setFSubject] = useState('')
  const [fGrade, setFGrade] = useState('')
  const [fUniversity, setFUniversity] = useState('')
  const [fLang, setFLang] = useState('')
  const [fHasQ, setFHasQ] = useState(false)
  const [fHasA, setFHasA] = useState(false)
  const [fHasExam, setFHasExam] = useState(false)
  const [fPrintable, setFPrintable] = useState(false)
  const [fMaxPrice, setFMaxPrice] = useState(50)
  const [sortBy, setSortBy] = useState<'sales' | 'new' | 'price-asc' | 'price-desc' | 'rating'>('sales')

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        setBooks((data ?? []).map(b => ({
          id: b.id as string,
          title: b.title as string,
          subject: b.subject as string,
          grade: b.grade as string,
          price: Number(b.price),
          discount_price: b.discount_price != null ? Number(b.discount_price) : undefined,
          pages: Number(b.pages ?? 0),
          description: (b.description as string) ?? '',
          cover_url: (b.cover_url as string) || undefined,
          rating: b.rating != null ? Number(b.rating) : 5,
          rating_count: Number(b.rating_count ?? 0),
          sales_count: Number(b.sales_count ?? 0),
          language: (b.language as string) ?? 'ar',
          semester: (b.semester as string) || undefined,
          university: (b.university as string) || undefined,
          faculty: (b.faculty as string) || undefined,
          specialization: (b.specialization as string) || undefined,
          level: (b.level as Book['level']) ?? 'school',
          includes_questions: Boolean(b.includes_questions),
          includes_answers: Boolean(b.includes_answers),
          includes_exams: Boolean(b.includes_exams),
          has_print_version: Boolean(b.has_print_version),
          badge: (b.badge as Book['badge']) || undefined,
          author: (b.author as string) || undefined,
          is_featured: Boolean(b.is_featured),
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const subjects = useMemo(() => ['', ...Array.from(new Set(books.map(b => b.subject)))], [books])
  const grades = useMemo(() => ['', ...Array.from(new Set(books.filter(b => b.level !== 'university').map(b => b.grade)))], [books])
  const universities = useMemo(() => ['', ...Array.from(new Set(books.filter(b => b.university).map(b => b.university!)))], [books])

  const filtered = useMemo(() => {
    let list = [...books]

    // Tab filter
    if (tab === 'school')     list = list.filter(b => b.level === 'school')
    if (tab === 'tawjihi')    list = list.filter(b => b.level === 'tawjihi' || b.badge === 'tawjihi')
    if (tab === 'university') list = list.filter(b => b.level === 'university')
    if (tab === 'bestseller') list = list.filter(b => b.badge === 'bestseller' || (b.sales_count ?? 0) > 0).sort((a,b) => (b.sales_count ?? 0) - (a.sales_count ?? 0))
    if (tab === 'new')        list = list.sort((a,b) => 0)  // sorted by created_at from API
    if (tab === 'discount')   list = list.filter(b => b.discount_price && b.discount_price < b.price)

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        (b.university ?? '').toLowerCase().includes(q) ||
        (b.specialization ?? '').toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q)
      )
    }

    // Sidebar filters
    if (fSubject)   list = list.filter(b => b.subject === fSubject)
    if (fGrade)     list = list.filter(b => b.grade === fGrade)
    if (fUniversity) list = list.filter(b => b.university === fUniversity)
    if (fLang)      list = list.filter(b => b.language === fLang)
    if (fHasQ)      list = list.filter(b => b.includes_questions)
    if (fHasA)      list = list.filter(b => b.includes_answers)
    if (fHasExam)   list = list.filter(b => b.includes_exams)
    if (fPrintable) list = list.filter(b => b.has_print_version)
    list = list.filter(b => (b.discount_price ?? b.price) <= fMaxPrice)

    // Sort
    if (sortBy === 'sales')      list.sort((a,b) => (b.sales_count ?? 0) - (a.sales_count ?? 0))
    if (sortBy === 'price-asc')  list.sort((a,b) => (a.discount_price ?? a.price) - (b.discount_price ?? b.price))
    if (sortBy === 'price-desc') list.sort((a,b) => (b.discount_price ?? b.price) - (a.discount_price ?? a.price))
    if (sortBy === 'rating')     list.sort((a,b) => (b.rating ?? 0) - (a.rating ?? 0))

    return list
  }, [books, tab, search, fSubject, fGrade, fUniversity, fLang, fHasQ, fHasA, fHasExam, fPrintable, fMaxPrice, sortBy])

  const handleAddToCart = (book: Book) => {
    addToCart({ productId: book.id, name: book.title, price: book.discount_price ?? book.price, quantity: 1, type: 'book' })
    window.dispatchEvent(new Event('cart-updated'))
    setToast(book.title)
    setTimeout(() => setToast(''), 3000)
  }

  const clearFilters = () => {
    setFSubject(''); setFGrade(''); setFUniversity(''); setFLang('')
    setFHasQ(false); setFHasA(false); setFHasExam(false); setFPrintable(false)
    setFMaxPrice(50)
  }

  const hasActiveFilters = fSubject || fGrade || fUniversity || fLang || fHasQ || fHasA || fHasExam || fPrintable || fMaxPrice < 50

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl">
          <ShoppingCart size={16} className="text-green-400 shrink-0" />
          <span className="text-sm font-medium">تمت الإضافة للسلة</span>
          <Link href="/cart" className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg">عرض السلة</Link>
          <button onClick={() => setToast('')} className="text-gray-400 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-l from-purple-50 to-blue-50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 ملخصات الكتب</h1>
            <p className="text-gray-500 max-w-xl mx-auto">ملخصات مدرسية وجامعية أعدّها مختصون لتسهيل الدراسة والمراجعة — تحميل فوري بعد الدفع</p>
          </div>
          <div className="max-w-2xl mx-auto relative">
            <Search size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم الكتاب أو المادة أو الجامعة أو التخصص..."
              className="w-full bg-white border border-border rounded-2xl pr-11 pl-4 py-3.5 text-sm focus:outline-none focus:border-primary shadow-sm"
            />
            {search && <button onClick={() => setSearch('')} className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400 hover:text-gray-600"><X size={16} /></button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar filters */}
          <div className={`lg:w-60 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl border border-border p-4 space-y-5 sticky top-20">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">تصفية النتائج</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700">مسح الكل</button>
                )}
              </div>

              {/* Subject */}
              <FilterSelect label="المادة" value={fSubject} onChange={setFSubject}
                options={subjects} labels={s => s || 'كل المواد'} />

              {/* Grade (school/tawjihi) */}
              {tab !== 'university' && (
                <FilterSelect label="الصف / المرحلة" value={fGrade} onChange={setFGrade}
                  options={grades} labels={g => g || 'كل المراحل'} />
              )}

              {/* University */}
              {tab !== 'school' && tab !== 'tawjihi' && (
                <FilterSelect label="الجامعة" value={fUniversity} onChange={setFUniversity}
                  options={universities} labels={u => u || 'كل الجامعات'} />
              )}

              {/* Language */}
              <FilterSelect label="اللغة" value={fLang} onChange={setFLang}
                options={['', 'ar', 'en']} labels={l => l === '' ? 'كل اللغات' : l === 'ar' ? 'عربي' : 'English'} />

              {/* Price range */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">الحد الأقصى للسعر: {fMaxPrice} د.أ</label>
                <input type="range" min={1} max={50} value={fMaxPrice} onChange={e => setFMaxPrice(Number(e.target.value))}
                  className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 د.أ</span><span>50 د.أ</span></div>
              </div>

              {/* Feature flags */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">المحتوى</p>
                <div className="space-y-2">
                  {[
                    [fHasQ, setFHasQ, 'يحتوي أسئلة تدريبية'] as const,
                    [fHasA, setFHasA, 'يحتوي إجابات نموذجية'] as const,
                    [fHasExam, setFHasExam, 'نماذج امتحانات سابقة'] as const,
                    [fPrintable, setFPrintable, 'نسخة قابلة للطباعة'] as const,
                  ].map(([val, setter, label]) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} className="w-4 h-4 accent-primary" />
                      <span className="text-sm text-gray-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilters(f => !f)} className="lg:hidden flex items-center gap-1.5 text-sm border border-border rounded-xl px-3 py-2 text-gray-600">
                  <Filter size={14} /> فلترة {hasActiveFilters && <span className="bg-primary text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">!</span>}
                </button>
                <p className="text-sm text-gray-500">{loading ? '...' : `${filtered.length} ملخص`}</p>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="border border-border rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none">
                <option value="sales">الأكثر مبيعاً</option>
                <option value="new">الأحدث</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="price-asc">السعر: الأقل</option>
                <option value="price-desc">السعر: الأعلى</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-4">📚</div>
                <p className="font-medium text-gray-600 mb-1">{books.length === 0 ? 'لا توجد ملخصات متاحة حالياً' : 'لا توجد نتائج'}</p>
                {hasActiveFilters && <button onClick={clearFilters} className="text-sm text-primary mt-2">مسح الفلاتر</button>}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(book => (
                  <BookCard key={book.id} book={book} onAddToCart={handleAddToCart} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────
function FilterSelect<T extends string>({ label, value, onChange, options, labels }: {
  label: string; value: T; onChange: (v: T) => void
  options: T[]; labels: (v: T) => string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value as T)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
        {options.map(o => <option key={o} value={o}>{labels(o)}</option>)}
      </select>
    </div>
  )
}
