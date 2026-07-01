'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { addToCart } from '@/lib/cart'

interface Book {
  id: string
  title: string
  subject: string
  grade?: string
  author?: string
  price: number
  discount_price?: number
  cover_url?: string
  description?: string
  level: 'school' | 'tawjihi' | 'university'
  language: string
  semester?: string
  university?: string
  faculty?: string
  specialization?: string
  includes_questions: boolean
  includes_answers: boolean
  includes_exams: boolean
  has_print_version: boolean
  badge?: string
  rating: number
  rating_count: number
  sales_count: number
  download_limit: number
  is_featured: boolean
  page_count?: number
}

const LEVEL_LABELS: Record<string, string> = { school: 'مدرسي', tawjihi: 'توجيهي', university: 'جامعي' }
const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  bestseller: { label: 'الأكثر مبيعاً', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  new: { label: 'جديد', color: 'bg-green-100 text-green-800 border-green-300' },
  recommended: { label: 'موصى به', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  discount: { label: 'خصم', color: 'bg-red-100 text-red-800 border-red-300' },
  tawjihi: { label: 'توجيهي', color: 'bg-purple-100 text-purple-800 border-purple-300' },
}

const SUBJECT_COLORS: Record<string, string> = {
  رياضيات: 'from-blue-500 to-blue-700',
  فيزياء: 'from-indigo-500 to-indigo-700',
  كيمياء: 'from-green-500 to-green-700',
  أحياء: 'from-emerald-500 to-emerald-700',
  عربي: 'from-amber-500 to-amber-700',
  إنجليزي: 'from-sky-500 to-sky-700',
  تاريخ: 'from-orange-500 to-orange-700',
  جغرافيا: 'from-teal-500 to-teal-700',
  default: 'from-primary to-blue-700',
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(s => (
          <svg key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-gray-600">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count} تقييم)</span>
    </div>
  )
}

function BookCoverLarge({ book }: { book: Book }) {
  const gradient = SUBJECT_COLORS[book.subject] ?? SUBJECT_COLORS.default
  if (book.cover_url) {
    return (
      <div className="relative w-full h-full rounded-2xl shadow-xl overflow-hidden">
        <Image src={book.cover_url} alt={book.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
      </div>
    )
  }
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} rounded-2xl shadow-xl flex flex-col items-center justify-center text-white p-6`}>
      <div className="text-5xl mb-3">📖</div>
      <p className="font-bold text-xl text-center leading-tight">{book.title}</p>
      {book.subject && <p className="text-sm mt-2 opacity-80">{book.subject}</p>}
    </div>
  )
}

function PreviewPlaceholder() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-gray-50 select-none">
      <div className="space-y-2 p-6 blur-sm pointer-events-none" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`h-3 rounded bg-gray-300 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
        <div className="text-center px-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="font-bold text-gray-800 mb-1">معاينة محدودة</p>
          <p className="text-sm text-gray-500">اشترِ الملخص للوصول إلى المحتوى الكامل</p>
          <div className="mt-2 text-xs text-gray-400 font-mono opacity-60">JO-PRINT © محمي</div>
        </div>
      </div>
    </div>
  )
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchaseType, setPurchaseType] = useState<'digital' | 'print' | 'bundle'>('digital')
  const [added, setAdded] = useState(false)
  const [tab, setTab] = useState<'about' | 'preview' | 'reviews'>('about')

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then(r => r.json())
      .then(data => { setBook(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!book || 'error' in (book as object)) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl">📚</div>
      <p className="text-gray-600 text-lg">الملخص غير موجود</p>
      <Link href="/books" className="text-primary hover:underline">العودة للملخصات</Link>
    </div>
  )

  const finalPrice = purchaseType === 'digital'
    ? (book.discount_price ?? book.price)
    : purchaseType === 'print'
    ? (book.discount_price ?? book.price) + 2
    : (book.discount_price ?? book.price) + 1.5

  const discountPct = book.discount_price
    ? Math.round((1 - book.discount_price / book.price) * 100)
    : null

  function handleAddToCart() {
    addToCart({
      productId: `book-${book!.id}-${purchaseType}`,
      name: `${book!.title} (${purchaseType === 'digital' ? 'رقمي' : purchaseType === 'print' ? 'مطبوع' : 'رقمي + مطبوع'})`,
      price: finalPrice,
      quantity: 1,
      type: 'book',
    })
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const TABS = [
    { key: 'about', label: 'نبذة عن الملخص' },
    { key: 'preview', label: 'معاينة' },
    { key: 'reviews', label: `التقييمات (${book.rating_count})` },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-surface">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary">الرئيسية</Link>
          <span>/</span>
          <Link href="/books" className="hover:text-primary">الملخصات</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate">{book.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left column: cover + purchase card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Cover */}
            <div className="w-full aspect-[3/4]">
              <BookCoverLarge book={book} />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-xs border border-border rounded-full px-3 py-1 text-gray-600">
                {LEVEL_LABELS[book.level]}
              </span>
              {book.badge && BADGE_LABELS[book.badge] && (
                <span className={`text-xs border rounded-full px-3 py-1 ${BADGE_LABELS[book.badge].color}`}>
                  {BADGE_LABELS[book.badge].label}
                </span>
              )}
              {book.language && (
                <span className="text-xs border border-border rounded-full px-3 py-1 text-gray-600">
                  {book.language === 'ar' ? 'عربي' : book.language === 'en' ? 'English' : book.language}
                </span>
              )}
            </div>

            {/* Purchase Card */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">اختر نوع الشراء</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { type: 'digital', label: 'رقمي', icon: '💾', extra: '' },
                    { type: 'print', label: 'مطبوع', icon: '🖨️', extra: '+2 د.أ' },
                    { type: 'bundle', label: 'رقمي + مطبوع', icon: '📦', extra: '+1.5 د.أ' },
                  ] as const).map(opt => (
                    <button
                      key={opt.type}
                      onClick={() => setPurchaseType(opt.type)}
                      className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        purchaseType === opt.type
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-gray-600 hover:border-primary/40'
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span>{opt.label}</span>
                      {opt.extra && <span className="text-gray-400 text-[10px]">{opt.extra}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{finalPrice.toFixed(3)}</span>
                <span className="text-gray-500">د.أ</span>
                {discountPct && purchaseType === 'digital' && (
                  <span className="text-sm line-through text-gray-400">{book.price.toFixed(3)}</span>
                )}
                {discountPct && purchaseType === 'digital' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    -{discountPct}%
                  </span>
                )}
              </div>

              {purchaseType === 'digital' && (
                <p className="text-xs text-gray-400">يُرسل رابط التحميل فور إتمام الدفع • {book.download_limit ?? 5} تنزيلات مسموحة</p>
              )}
              {purchaseType === 'print' && (
                <p className="text-xs text-gray-400">يُطبع ويُوصَّل خلال 2–3 أيام عمل</p>
              )}
              {purchaseType === 'bundle' && (
                <p className="text-xs text-gray-400">تحميل فوري + نسخة مطبوعة بالبريد</p>
              )}

              <button
                onClick={handleAddToCart}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                }`}
              >
                {added ? '✓ تمت الإضافة للسلة' : 'أضف للسلة'}
              </button>

              <button
                onClick={() => { handleAddToCart(); router.push('/checkout') }}
                className="w-full py-3 rounded-xl font-bold text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all"
              >
                اشتري الآن
              </button>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl border border-border p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{book.sales_count ?? 0}</p>
                <p className="text-xs text-gray-500">مبيعة</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{book.page_count ?? '—'}</p>
                <p className="text-xs text-gray-500">صفحة</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{book.rating.toFixed(1)}</p>
                <p className="text-xs text-gray-500">تقييم</p>
              </div>
            </div>
          </div>

          {/* Right column: details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
              {book.author && <p className="text-gray-500 mb-2">✍️ {book.author}</p>}
              <StarRating rating={book.rating} count={book.rating_count} />

              <div className="flex flex-wrap gap-2 mt-3">
                {book.subject && (
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{book.subject}</span>
                )}
                {book.grade && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">الصف {book.grade}</span>
                )}
                {book.university && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{book.university}</span>
                )}
                {book.faculty && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{book.faculty}</span>
                )}
                {book.semester && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">الفصل {book.semester}</span>
                )}
              </div>
            </div>

            {/* What's included */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📋</span> محتوى الملخص
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'includes_questions', label: 'أسئلة تدريبية', icon: '❓' },
                  { key: 'includes_answers', label: 'إجابات نموذجية', icon: '✅' },
                  { key: 'includes_exams', label: 'امتحانات سابقة', icon: '📝' },
                  { key: 'has_print_version', label: 'نسخة مطبوعة متوفرة', icon: '🖨️' },
                ].map(item => {
                  const included = book[item.key as keyof Book] as boolean
                  return (
                    <div key={item.key} className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                      included ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <span>{included ? '✓' : '✗'}</span>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="flex border-b border-border">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key as typeof tab)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      tab === t.key
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {tab === 'about' && (
                  <div className="space-y-4">
                    {book.description ? (
                      <p className="text-gray-700 leading-relaxed text-sm">{book.description}</p>
                    ) : (
                      <p className="text-gray-400 text-sm">لا يوجد وصف متاح لهذا الملخص.</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { label: 'المستوى', value: LEVEL_LABELS[book.level] },
                        { label: 'المادة', value: book.subject },
                        { label: 'اللغة', value: book.language === 'ar' ? 'عربي' : book.language === 'en' ? 'English' : book.language },
                        ...(book.specialization ? [{ label: 'التخصص', value: book.specialization }] : []),
                        ...(book.university ? [{ label: 'الجامعة', value: book.university }] : []),
                        ...(book.faculty ? [{ label: 'الكلية', value: book.faculty }] : []),
                      ].map(row => (
                        <div key={row.label} className="flex gap-2 text-sm">
                          <span className="text-gray-500 shrink-0">{row.label}:</span>
                          <span className="text-gray-800 font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'preview' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">نموذج من الصفحات الأولى — المحتوى الكامل يتاح بعد الشراء</p>
                    <PreviewPlaceholder />
                    <PreviewPlaceholder />
                  </div>
                )}

                {tab === 'reviews' && (
                  <div className="space-y-4">
                    {book.rating_count === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">⭐</div>
                        <p className="text-gray-500 text-sm">لا توجد تقييمات بعد — كن أول من يقيّم هذا الملخص</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-5xl font-bold text-gray-900">{book.rating.toFixed(1)}</p>
                          <StarRating rating={book.rating} count={book.rating_count} />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">التقييمات متاحة فقط للمشترين الموثّقين</p>
                  </div>
                )}
              </div>
            </div>

            {/* CTA bottom banner */}
            <div className="bg-gradient-to-l from-primary/10 to-blue-50 rounded-2xl border border-primary/20 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900">جاهز للبدء في الدراسة؟</p>
                <p className="text-sm text-gray-600 mt-0.5">احصل على {book.title} الآن واستعد لامتحاناتك</p>
              </div>
              <button
                onClick={handleAddToCart}
                className="shrink-0 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                أضف للسلة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
