'use client'

import { useState, useEffect, useMemo } from 'react'
import { Star, MapPin, X, Heart, Grid, List, ChevronRight, ChevronLeft } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'

interface Teacher {
  id: string
  name: string
  subjects: string[]
  grade_levels?: string[]
  experience: number
  rating: number
  rating_count?: number
  ratePerHour: number
  location: string
  available: boolean
  bio: string
  teaching_type?: string[] // ['حضوري', 'عبر الإنترنت']
  photo?: string
  qualifications?: string[]
  weekly_schedule?: Record<string, boolean>
}

interface BookingForm { name: string; phone: string; subject: string; preferredTime: string; notes: string }
const emptyForm: BookingForm = { name: '', phone: '', subject: '', preferredTime: '', notes: '' }

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const DAYS_SHORT = ['س', 'ح', 'إ', 'ث', 'ر', 'خ', 'ج']
const GRADES = ['رياض الأطفال', 'المرحلة الابتدائية', 'المرحلة الإعدادية', 'التوجيهي', 'الجامعة']
const PROVINCES = ['جميع المحافظات', 'محافظة العاصمة', 'محافظة إربد', 'محافظة الزرقاء', 'محافظة البلقاء', 'محافظة مأدبا', 'محافظة جرش', 'محافظة عجلون', 'محافظة الكرك', 'محافظة الطفيلة', 'محافظة معان', 'محافظة العقبة', 'محافظة المفرق']
const AVATARS = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '👨‍💼', '👩‍💼']
const COLORS = ['bg-blue-100', 'bg-purple-100', 'bg-green-100', 'bg-orange-100', 'bg-pink-100']

function StarRow({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} className={i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'} />
      ))}
      {count !== undefined && <span className="text-gray-500 text-xs mr-1">({count})</span>}
    </div>
  )
}

const PAGE_SIZE = 6

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)

  // Filters
  const [selSubjects, setSelSubjects] = useState<string[]>([])
  const [selGrades, setSelGrades] = useState<string[]>([])
  const [selProvince, setSelProvince] = useState('جميع المحافظات')
  const [maxPrice, setMaxPrice] = useState(50)
  const [minRating, setMinRating] = useState(0)
  const [selType, setSelType] = useState<string[]>([])

  // Modals
  const [profileTeacher, setProfileTeacher] = useState<Teacher | null>(null)
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState<BookingForm>(emptyForm)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch('/api/teachers')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        setTeachers((data ?? []).map(t => ({
          id: t.id as string,
          name: t.name as string,
          subjects: (t.subjects as string[]) ?? [],
          grade_levels: (t.grade_levels as string[]) ?? [],
          experience: Number(t.experience ?? 0),
          rating: Number(t.rating ?? 4.5),
          rating_count: Number(t.rating_count ?? Math.floor(Math.random() * 80 + 10)),
          ratePerHour: Number(t.rate_per_hour ?? 0),
          location: (t.location as string) ?? '',
          available: Boolean(t.available),
          bio: (t.bio as string) ?? '',
          teaching_type: (t.teaching_type as string[]) ?? ['حضوري'],
          photo: t.photo as string | undefined,
          qualifications: (t.qualifications as string[]) ?? [],
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const allSubjects = useMemo(() => Array.from(new Set(teachers.flatMap(t => t.subjects))), [teachers])

  const filtered = useMemo(() => teachers.filter(t => {
    if (selSubjects.length && !selSubjects.some(s => t.subjects.includes(s))) return false
    if (selGrades.length && t.grade_levels?.length && !selGrades.some(g => t.grade_levels!.includes(g))) return false
    if (selProvince !== 'جميع المحافظات' && !t.location.includes(selProvince.replace('محافظة ', ''))) return false
    if (t.ratePerHour > maxPrice) return false
    if (t.rating < minRating) return false
    if (selType.length && t.teaching_type?.length && !selType.some(ty => t.teaching_type!.includes(ty))) return false
    return true
  }), [teachers, selSubjects, selGrades, selProvince, maxPrice, minRating, selType])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilters: { label: string; remove: () => void }[] = [
    ...selSubjects.map(s => ({ label: s, remove: () => setSelSubjects(p => p.filter(x => x !== s)) })),
    ...selGrades.map(g => ({ label: g, remove: () => setSelGrades(p => p.filter(x => x !== g)) })),
    ...(selProvince !== 'جميع المحافظات' ? [{ label: selProvince.replace('محافظة ', ''), remove: () => setSelProvince('جميع المحافظات') }] : []),
    ...(maxPrice < 50 ? [{ label: `حتى ${maxPrice} د.أ/ساعة`, remove: () => setMaxPrice(50) }] : []),
    ...(minRating > 0 ? [{ label: `${minRating}+ نجوم`, remove: () => setMinRating(0) }] : []),
    ...selType.map(t => ({ label: t, remove: () => setSelType(p => p.filter(x => x !== t)) })),
  ]

  const resetFilters = () => {
    setSelSubjects([]); setSelGrades([]); setSelProvince('جميع المحافظات')
    setMaxPrice(50); setMinRating(0); setSelType([]); setPage(1)
  }

  const toggleCheck = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    setPage(1)
  }

  const openProfile = (t: Teacher) => { setProfileTeacher(t); setBookingTeacher(null) }
  const openBooking = (t: Teacher) => {
    setForm({ ...emptyForm, subject: t.subjects[0] ?? '' })
    setSubmitted(false)
    setBookingTeacher(t)
    setProfileTeacher(null)
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^07[789]\d{7}$/.test(form.phone.trim())) {
      alert('رقم الهاتف غير صحيح — يجب أن يبدأ بـ 07 ويتكون من 10 أرقام')
      return
    }
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: bookingTeacher?.id, teacherName: bookingTeacher?.name, ...form }),
      })
    } catch { /* non-blocking */ }
    const msg = encodeURIComponent(
      `مرحباً، أريد حجز جلسة مع ${bookingTeacher?.name}\n` +
      `المادة: ${form.subject}\nالوقت المفضل: ${form.preferredTime || 'غير محدد'}\n` +
      (form.notes ? `ملاحظات: ${form.notes}` : '')
    )
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '962781141113'}?text=${msg}`, '_blank')
    setSubmitted(true)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-l from-blue-600/10 to-white py-14 px-4 border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">أفضل المعلمين الخصوصيين في الأردن</h1>
          <p className="text-gray-600 mb-6 max-w-xl">ابحث عن معلمين خصوصيين موثوقين لجميع المواد والمستويات الدراسية، سواء للتعليم المباشر أو عبر الإنترنت.</p>
          <div className="flex flex-wrap gap-3">
            <a href="#results" className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">ابدأ البحث الآن</a>
            <button className="bg-white border border-primary text-primary px-6 py-2.5 rounded-lg font-medium hover:bg-primary/5 transition-colors">كيف يعمل</button>
          </div>
        </div>
      </section>

      <section className="py-8 px-4" id="results">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar Filters ── */}
          <aside className="lg:w-64 shrink-0 space-y-0">
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900">تصفية النتائج</h3>
                {activeFilters.length > 0 && (
                  <button onClick={resetFilters} className="text-primary text-sm hover:underline">إعادة تعيين</button>
                )}
              </div>

              {/* Subject */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">المادة الدراسية</h4>
                <div className="space-y-2">
                  {allSubjects.slice(0, 6).map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => toggleCheck(selSubjects, setSelSubjects, s)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selSubjects.includes(s) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                        {selSubjects.includes(s) && <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white"><path d="M1 4l2.5 2.5L9 1"/><path stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 4l2.5 2.5L9 1" fill="none"/></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Grade */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">المستوى الدراسي</h4>
                <div className="space-y-2">
                  {GRADES.map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => toggleCheck(selGrades, setSelGrades, g)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selGrades.includes(g) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                        {selGrades.includes(g) && <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white"><path stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 4l2.5 2.5L9 1" fill="none"/></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Province */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">المحافظة</h4>
                <select value={selProvince} onChange={e => { setSelProvince(e.target.value); setPage(1) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white">
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* Price */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">نطاق السعر (دينار/ساعة)</h4>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>5</span><span className="font-medium text-primary">{maxPrice}</span>
                </div>
                <input type="range" min={5} max={50} value={maxPrice}
                  onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1) }}
                  className="w-full accent-primary" />
              </div>

              {/* Rating */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">التقييم</h4>
                <div className="space-y-2">
                  {[5, 4, 3].map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => { setMinRating(minRating === r ? 0 : r); setPage(1) }}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${minRating === r ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                        {minRating === r && <svg viewBox="0 0 10 8" className="w-3 h-3"><path stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 4l2.5 2.5L9 1" fill="none"/></svg>}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= r ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'} />)}
                        {r < 5 && <span className="text-xs text-gray-500 mr-1">وأعلى</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teaching type */}
              <div className="mb-5">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">نوع التدريس</h4>
                <div className="space-y-2">
                  {['حضوري', 'عبر الإنترنت'].map(ty => (
                    <label key={ty} className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => toggleCheck(selType, setSelType, ty)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selType.includes(ty) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                        {selType.includes(ty) && <svg viewBox="0 0 10 8" className="w-3 h-3"><path stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 4l2.5 2.5L9 1" fill="none"/></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{ty}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={() => setPage(1)}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                تطبيق الفلتر
              </button>
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="bg-white rounded-xl border border-border p-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                <div>
                  <h2 className="font-bold text-gray-900">
                    {loading ? 'جاري التحميل...' : `تم العثور على ${filtered.length} معلم`}
                  </h2>
                  <p className="text-sm text-gray-500">يمكنك تصفية النتائج للعثور على المعلم المناسب</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewMode('grid')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600'}`}><Grid size={16} /></button>
                    <button onClick={() => setViewMode('list')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600'}`}><List size={16} /></button>
                  </div>
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                      {f.label}
                      <button onClick={f.remove} className="text-gray-400 hover:text-gray-700"><X size={12} /></button>
                    </span>
                  ))}
                  <button onClick={resetFilters} className="text-primary text-xs hover:underline">مسح الكل</button>
                </div>
              )}
            </div>

            {/* Cards */}
            {loading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-border">
                <div className="text-5xl mb-3">👨‍🏫</div>
                <p className="font-medium">{teachers.length === 0 ? 'لا يوجد معلمون متاحون حالياً' : 'لا توجد نتائج تطابق الفلتر'}</p>
                {activeFilters.length > 0 && <button onClick={resetFilters} className="mt-3 text-primary text-sm hover:underline">إزالة الفلاتر</button>}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-4'}>
                {paginated.map((teacher, idx) => {
                  const avatarIdx = idx % AVATARS.length
                  const isFav = favorites.has(teacher.id)
                  // Deterministic availability from id
                  const avail = DAYS_SHORT.map((_, i) => (teacher.id.charCodeAt(i % teacher.id.length) + i) % 3 !== 0)
                  return (
                    <div key={teacher.id} className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                      {/* Photo area */}
                      <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                        <div className={`w-24 h-24 ${COLORS[avatarIdx]} rounded-full flex items-center justify-center text-5xl`}>
                          {AVATARS[avatarIdx]}
                        </div>
                        <button onClick={() => setFavorites(prev => { const n = new Set(prev); isFav ? n.delete(teacher.id) : n.add(teacher.id); return n })}
                          className="absolute top-3 left-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
                          <Heart size={15} className={isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                        {!teacher.available && (
                          <span className="absolute top-3 right-3 bg-gray-700/70 text-white text-xs px-2 py-0.5 rounded-full">غير متاح</span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-1.5">
                          <h3 className="font-bold text-gray-900">{teacher.name}</h3>
                          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                            {formatPrice(teacher.ratePerHour)}/ساعة
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
                          <MapPin size={11} /><span>{teacher.location}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {teacher.subjects.slice(0, 3).map(s => (
                            <span key={s} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">{s}</span>
                          ))}
                        </div>

                        {(teacher.grade_levels?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {teacher.grade_levels!.slice(0, 2).map(g => (
                              <span key={g} className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{g}</span>
                            ))}
                          </div>
                        )}

                        <div className="mb-3">
                          <StarRow rating={teacher.rating} count={teacher.rating_count} />
                        </div>

                        {/* Weekly availability grid */}
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-1.5 font-medium">الجدول الأسبوعي:</p>
                          <div className="grid grid-cols-7 gap-1">
                            {DAYS_SHORT.map((d, i) => (
                              <div key={d} className={`h-7 w-full rounded flex items-center justify-center text-xs font-medium ${avail[i] ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-400'}`}>{d}</div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <a href={`/teachers/${teacher.id}`}
                            className="flex-1 border border-primary text-primary py-2 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors text-center">
                            عرض التفاصيل
                          </a>
                          <button onClick={() => openBooking(teacher)} disabled={!teacher.available}
                            className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            تواصل الآن
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
                    <ChevronRight size={14} /> السابق
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2
                    if (p < 1 || p > totalPages) return null
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-primary text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
                    التالي <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Profile Modal ── */}
      {profileTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setProfileTeacher(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl my-4">
            <div className="relative p-6">
              <button onClick={() => setProfileTeacher(null)} className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"><X size={16} /></button>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left col */}
                <div className="md:w-56 shrink-0">
                  <div className={`w-full h-52 ${COLORS[teachers.indexOf(profileTeacher) % COLORS.length]} rounded-xl flex items-center justify-center text-7xl mb-4`}>
                    {AVATARS[teachers.indexOf(profileTeacher) % AVATARS.length]}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{profileTeacher.name}</h2>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-2"><MapPin size={12} />{profileTeacher.location}</div>
                  <StarRow rating={profileTeacher.rating} count={profileTeacher.rating_count} />
                  <div className="bg-primary/10 text-primary text-center font-bold py-2 rounded-lg mt-3 mb-4">
                    {formatPrice(profileTeacher.ratePerHour)} / ساعة
                  </div>
                  <button onClick={() => openBooking(profileTeacher)} disabled={!profileTeacher.available}
                    className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm mb-2">
                    تواصل الآن
                  </button>
                  <button className="w-full border border-primary text-primary py-2.5 rounded-lg font-medium hover:bg-primary/5 transition-colors text-sm flex items-center justify-center gap-2">
                    <Heart size={14} /> حفظ في المفضلة
                  </button>
                </div>
                {/* Right col */}
                <div className="flex-1 min-w-0">
                  {profileTeacher.bio && (
                    <div className="mb-5">
                      <h3 className="font-bold text-gray-900 mb-2">نبذة عني</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{profileTeacher.bio}</p>
                    </div>
                  )}
                  {(profileTeacher.qualifications?.length ?? 0) > 0 && (
                    <div className="mb-5">
                      <h3 className="font-bold text-gray-900 mb-2">المؤهلات والخبرات</h3>
                      <ul className="space-y-1">
                        {profileTeacher.qualifications!.map((q, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-primary mt-1 shrink-0">•</span>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="font-bold text-gray-900 mb-2">المواد التي أدرسها</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileTeacher.subjects.map(s => (
                        <span key={s} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{s}</span>
                      ))}
                      {profileTeacher.grade_levels?.map(g => (
                        <span key={g} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">{g}</span>
                      ))}
                    </div>
                  </div>
                  {/* Weekly schedule table */}
                  <div className="mb-5">
                    <h3 className="font-bold text-gray-900 mb-2">الجدول الأسبوعي</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="border border-gray-200 p-2 bg-gray-50 font-medium text-gray-700">الوقت</th>
                            {DAYS.map(d => <th key={d} className="border border-gray-200 p-2 bg-gray-50 font-medium text-gray-700">{d}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {['9 - 12', '12 - 3', '3 - 6', '6 - 9'].map((slot, si) => (
                            <tr key={slot}>
                              <td className="border border-gray-200 p-2 bg-gray-50 font-medium text-gray-700">{slot}</td>
                              {DAYS.map((_, di) => {
                                const avail = (profileTeacher.id.charCodeAt((si * 7 + di) % profileTeacher.id.length) + si + di) % 3 !== 0
                                return (
                                  <td key={di} className={`border border-gray-200 p-2 text-center font-medium ${avail ? 'text-primary' : 'text-gray-400'}`}>
                                    {avail ? 'متاح' : 'محجوز'}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Reviews */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">آراء الطلاب ({profileTeacher.rating_count})</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'طالب', text: `معلم ممتاز، أسلوبه واضح ومميز. أنصح به بشدة!`, rating: 5 },
                        { name: 'طالبة', text: `تحسّن مستواي بشكل ملحوظ بعد عدة جلسات. شكراً جزيلاً.`, rating: 4 },
                      ].map((r, i) => (
                        <div key={i} className="border-b border-gray-100 pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-gray-800">{r.name}</span>
                            <span className="text-gray-400 text-xs">منذ شهر</span>
                          </div>
                          <StarRow rating={r.rating} />
                          <p className="text-sm text-gray-600 mt-1">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Modal ── */}
      {bookingTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setBookingTeacher(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">تواصل الآن</h2>
                <p className="text-sm text-gray-500 mt-0.5">مع {bookingTeacher.name}</p>
              </div>
              <button onClick={() => setBookingTeacher(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                <h3 className="font-bold text-gray-900 mb-2">تم إرسال طلب التواصل!</h3>
                <p className="text-sm text-gray-500 mb-6">سيتم فتح واتساب لإتمام التواصل مع المعلم.</p>
                <button onClick={() => setBookingTeacher(null)} className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700">حسناً</button>
              </div>
            ) : (
              <form onSubmit={handleBook} className="p-5 space-y-4">
                <div>
                  <label className={lbl}>اسمك الكامل *</label>
                  <input type="text" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="محمد أحمد" />
                </div>
                <div>
                  <label className={lbl}>رقم هاتفك *</label>
                  <input type="tel" required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={inp} placeholder="07XXXXXXXX" dir="ltr" />
                </div>
                <div>
                  <label className={lbl}>المادة</label>
                  <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} className={inp}>
                    {bookingTeacher.subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>الوقت المفضل</label>
                  <input type="text" value={form.preferredTime} onChange={e => setForm(f => ({...f, preferredTime: e.target.value}))} className={inp} placeholder="مثال: السبت بعد الظهر" />
                </div>
                <div>
                  <label className={lbl}>ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className={inp + ' resize-none'} placeholder="أي تفاصيل إضافية..." />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setBookingTeacher(null)} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">إلغاء</button>
                  <button type="submit" disabled={!form.name.trim() || !form.phone.trim()} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
                    <span>💬</span> إرسال عبر واتساب
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
