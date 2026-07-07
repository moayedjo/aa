'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Star, MapPin, GraduationCap, CheckCircle, Wifi, Users, ArrowRight, MessageCircle, Calendar, BookOpen, Clock, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'

interface Teacher {
  id: string
  name: string
  subjects: string[]
  grade_levels?: string[]
  experience: number
  rating: number
  rating_count?: number
  rate_per_hour: number
  location: string
  available: boolean
  bio?: string
  teaching_type?: string[]
  photo?: string
  qualifications?: string[]
  weekly_schedule?: Record<string, boolean>
}

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const DAYS_SHORT = ['س', 'ح', 'إ', 'ث', 'ر', 'خ', 'ج']

function StarRow({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} className={i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'} />
      ))}
      <span className="font-semibold text-gray-800 text-sm mr-1">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-gray-500 text-xs">({count} تقييم)</span>}
    </div>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0]
}

type Tab = 'about' | 'subjects' | 'schedule' | 'reviews'

export default function TeacherProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('about')
  const [showBooking, setShowBooking] = useState(false)
  const [bookingForm, setBookingForm] = useState({ name: '', phone: '', subject: '', preferredTime: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [bookingDone, setBookingDone] = useState(false)

  useEffect(() => {
    fetch(`/api/teachers/${params.id}`)
      .then(r => r.json())
      .then(data => { setTeacher(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacher) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/teachers/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teacher.id, teacherName: teacher.name, ...bookingForm }),
      })
      if (res.ok) setBookingDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleWhatsApp = () => {
    if (!teacher) return
    const msg = encodeURIComponent(`مرحباً، أود التواصل معك بخصوص الدروس الخصوصية.\nالمعلم: ${teacher.name}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">لم يتم العثور على المعلم</p>
        <button onClick={() => router.back()} className="text-primary text-sm flex items-center gap-1">
          <ArrowRight size={16} /> العودة للقائمة
        </button>
      </div>
    )
  }

  const avail = teacher.weekly_schedule
    ? DAYS_SHORT.map((_, i) => teacher.weekly_schedule![DAYS[i]] ?? false)
    : [true, true, false, true, true, true, false]

  const isOnline = teacher.teaching_type?.includes('عبر الإنترنت') ?? true
  const isInPerson = teacher.teaching_type?.includes('حضوري') ?? true

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: 'نبذة' },
    { id: 'subjects', label: 'المواد' },
    { id: 'schedule', label: 'الجدول' },
    { id: 'reviews', label: `التقييمات (${teacher.rating_count ?? 0})` },
  ]

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => router.push('/')} className="hover:text-primary">الرئيسية</button>
          <ChevronRight size={14} className="rotate-180" />
          <button onClick={() => router.push('/teachers')} className="hover:text-primary">المعلمون</button>
          <ChevronRight size={14} className="rotate-180" />
          <span className="text-gray-800 font-medium">{teacher.name}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile header card */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0 overflow-hidden">
                  {teacher.photo
                    ? <Image src={teacher.photo} alt={teacher.name} fill sizes="80px" className="object-cover" />
                    : <span>{getInitials(teacher.name)}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900">{teacher.name}</h1>
                  <div className="mt-1">
                    <StarRow rating={teacher.rating} count={teacher.rating_count} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-primary" />
                      {teacher.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap size={14} className="text-primary" />
                      {teacher.experience} سنوات خبرة
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full font-medium">
                      <CheckCircle size={12} /> معتمد
                    </span>
                    {isOnline && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium">
                        <Wifi size={12} /> أونلاين
                      </span>
                    )}
                    {isInPerson && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full font-medium">
                        <Users size={12} /> حضوري
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="flex border-b border-border">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'about' && (
                  <div className="space-y-5">
                    {/* Bio */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <BookOpen size={16} className="text-primary" /> نبذة عن المعلم
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {teacher.bio || 'معلم متخصص ذو خبرة واسعة في مجاله.'}
                      </p>
                    </div>

                    {/* Qualifications */}
                    {teacher.qualifications && teacher.qualifications.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <GraduationCap size={16} className="text-primary" /> المؤهلات والخبرة
                        </h3>
                        <ul className="space-y-2">
                          {teacher.qualifications.map((q, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Success rate */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">نسبة النجاح</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-green-500 h-2.5 rounded-full"
                            style={{ width: `${Math.min(100, teacher.rating * 20)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-green-700">
                          {Math.round(teacher.rating * 20)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'subjects' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects.map(s => (
                        <span key={s} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                    {teacher.grade_levels && teacher.grade_levels.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2 text-sm">المراحل الدراسية</h4>
                        <div className="flex flex-wrap gap-2">
                          {teacher.grade_levels.map(g => (
                            <span key={g} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">أيام التدريس المتاحة</p>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_SHORT.map((d, i) => (
                        <div key={d} className="text-center">
                          <div className={`h-9 w-full rounded-lg flex items-center justify-center text-xs font-semibold mb-1 ${avail[i] ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-400'}`}>{d}</div>
                          <div className="text-xs text-gray-400">{avail[i] ? '✓' : '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 mt-1">
                      {DAYS.map((d, i) => (
                        <div key={d} className="text-center text-xs text-gray-400 truncate">{d.replace('محافظة ', '').slice(0, 3)}</div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="text-center py-8 text-gray-400">
                    <Star size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">لا توجد تقييمات بعد</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — rate + booking */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-5 sticky top-6">
              <div className="text-center mb-5">
                <div className="text-3xl font-bold text-primary">{formatPrice(teacher.rate_per_hour)}</div>
                <div className="text-sm text-gray-500 mt-1">لكل ساعة</div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowBooking(true)}
                  className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar size={18} /> احجز الآن
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="w-full border border-green-500 text-green-600 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} /> تواصل مع المعلم
                </button>
              </div>

              <div className="mt-5 space-y-3 text-sm text-gray-600 border-t border-border pt-4">
                <div className="flex justify-between">
                  <span>الخبرة</span>
                  <span className="font-medium text-gray-800">{teacher.experience} سنوات</span>
                </div>
                <div className="flex justify-between">
                  <span>التقييم</span>
                  <span className="font-medium text-yellow-600">{teacher.rating.toFixed(1)} ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>الموقع</span>
                  <span className="font-medium text-gray-800">{teacher.location}</span>
                </div>
                {teacher.available && (
                  <div className="flex justify-between">
                    <span>الحالة</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> متاح الآن
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBooking(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            {bookingDone ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">تم إرسال طلبك!</h3>
                <p className="text-gray-500 text-sm mb-4">سيتواصل معك المعلم قريباً</p>
                <button onClick={() => { setShowBooking(false); setBookingDone(false) }} className="bg-primary text-white px-6 py-2 rounded-lg font-medium">
                  حسناً
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-4">حجز موعد — {teacher.name}</h2>
                <form onSubmit={handleBook} className="space-y-3">
                  <input required placeholder="الاسم الكامل *" value={bookingForm.name}
                    onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input required placeholder="رقم الهاتف *" value={bookingForm.phone}
                    onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <select value={bookingForm.subject} onChange={e => setBookingForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    <option value="">اختر المادة</option>
                    {teacher.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input placeholder="الوقت المفضل" value={bookingForm.preferredTime}
                    onChange={e => setBookingForm(f => ({ ...f, preferredTime: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <textarea placeholder="ملاحظات إضافية" value={bookingForm.notes} rows={2}
                    onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowBooking(false)}
                      className="flex-1 border border-border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      إلغاء
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
