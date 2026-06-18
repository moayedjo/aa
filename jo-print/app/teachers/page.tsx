'use client'

import { useState } from 'react'
import { teachers } from '@/lib/data/teachers'
import { Star, MapPin } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'

const subjects = ['الكل', 'رياضيات', 'فيزياء', 'لغة عربية', 'لغة إنجليزية', 'كيمياء', 'علوم']

export default function TeachersPage() {
  const [selectedSubject, setSelectedSubject] = useState('الكل')

  const filtered = teachers.filter(t =>
    selectedSubject === 'الكل' || t.subjects.includes(selectedSubject)
  )

  return (
    <div className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">المعلمين والمدرسين</h1>
          <p className="text-gray-500">تواصل مع أفضل المعلمين الخصوصيين في الأردن</p>
        </div>

        {/* Subject Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedSubject === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(teacher => (
            <div key={teacher.id} className="bg-white border border-border rounded-[12px] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-2xl shrink-0">
                  👨‍🏫
                </div>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      teacher.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {teacher.available ? 'متاح' : 'غير متاح'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 my-2">
                    {teacher.subjects.map(s => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin size={12} />
                    <span>{teacher.location}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{teacher.bio}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{formatPrice(teacher.ratePerHour)} / ساعة</span>
                    <button
                      disabled={!teacher.available}
                      className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      احجز جلسة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
