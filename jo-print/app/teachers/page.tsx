'use client'

import { useState, useEffect } from 'react'
import type { Teacher } from '@/lib/types'
import { Star, MapPin, X, Phone } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'

interface BookingForm { name: string; phone: string; subject: string; preferredTime: string; notes: string }
const emptyForm: BookingForm = { name: '', phone: '', subject: '', preferredTime: '', notes: '' }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState('الكل')
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
          subjects: t.subjects as string[],
          experience: Number(t.experience),
          rating: Number(t.rating),
          ratePerHour: Number(t.rate_per_hour),
          location: t.location as string,
          available: Boolean(t.available),
          bio: t.bio as string ?? '',
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const allSubjects = ['الكل', ...Array.from(new Set(teachers.flatMap(t => t.subjects)))]

  const filtered = teachers.filter(t =>
    selectedSubject === 'الكل' || t.subjects.includes(selectedSubject)
  )

  const openBooking = (t: Teacher) => {
    setForm({ ...emptyForm, subject: t.subjects[0] ?? '' })
    setSubmitted(false)
    setBookingTeacher(t)
  }

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    const msg = encodeURIComponent(
      `مرحباً، أريد حجز جلسة مع ${bookingTeacher?.name}\n` +
      `الاسم: ${form.name}\nالهاتف: ${form.phone}\n` +
      `المادة: ${form.subject}\nالوقت المفضل: ${form.preferredTime}\n` +
      (form.notes ? `ملاحظات: ${form.notes}` : '')
    )
    const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '962781141113'
    window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank')
    setSubmitted(true)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">المعلمين والمدرسين</h1>
          <p className="text-gray-500">تواصل مع أفضل المعلمين الخصوصيين في الأردن</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {allSubjects.map(s => (
            <button key={s} onClick={() => setSelectedSubject(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedSubject === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">👨‍🏫</div>
            <p>{teachers.length === 0 ? 'لا يوجد معلمون متاحون حالياً' : 'لا توجد نتائج'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map(teacher => (
              <div key={teacher.id} className="bg-white border border-border rounded-[12px] p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-2xl shrink-0">👨‍🏫</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{teacher.name}</h3>
                        <div className="flex items-center gap-1 text-yellow-500 text-sm">
                          <Star size={14} fill="currentColor" />
                          <span>{teacher.rating}</span>
                          <span className="text-gray-400">({teacher.experience} سنوات خبرة)</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${teacher.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {teacher.available ? 'متاح' : 'غير متاح'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 my-2">
                      {teacher.subjects.map(s => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <MapPin size={12} /><span>{teacher.location}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{teacher.bio}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{formatPrice(teacher.ratePerHour)} / ساعة</span>
                      <button onClick={() => openBooking(teacher)} disabled={!teacher.available}
                        className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        احجز جلسة
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {bookingTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">حجز جلسة</h2>
                <p className="text-sm text-gray-500 mt-0.5">مع {bookingTeacher.name}</p>
              </div>
              <button onClick={() => setBookingTeacher(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                <h3 className="font-bold text-gray-900 mb-2">تم إرسال طلب الحجز!</h3>
                <p className="text-sm text-gray-500 mb-1">سيتواصل معك المعلم قريباً على واتساب.</p>
                <p className="text-xs text-gray-400 mb-6 flex items-center justify-center gap-1"><Phone size={12} />{form.phone}</p>
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
                  <label className={lbl}>الوقت المفضل للجلسة</label>
                  <input type="text" value={form.preferredTime} onChange={e => setForm(f => ({...f, preferredTime: e.target.value}))} className={inp} placeholder="مثال: السبت بعد الظهر" />
                </div>
                <div>
                  <label className={lbl}>ملاحظات إضافية <span className="text-gray-400 font-normal">(اختياري)</span></label>
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

