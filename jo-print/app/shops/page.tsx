'use client'

import { useState, useEffect } from 'react'
import type { PrintShop } from '@/lib/types'
import { Phone, Clock, Star, MapPin, Search } from 'lucide-react'

export default function ShopsPage() {
  const [shops, setShops] = useState<PrintShop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedArea, setSelectedArea] = useState('الكل')

  useEffect(() => {
    fetch('/api/shops')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        setShops((data ?? []).map(s => ({
          id: s.id as string,
          name: s.name as string,
          address: s.address as string,
          area: s.area as string,
          phone: s.phone as string,
          hours: s.hours as string ?? '',
          rating: Number(s.rating),
          services: s.services as string[] ?? [],
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const areas = ['الكل', ...Array.from(new Set(shops.map(s => s.area)))]

  const filtered = shops.filter(s => {
    const matchArea = selectedArea === 'الكل' || s.area === selectedArea
    const matchSearch = !search || s.name.includes(search) || s.address.includes(search) || s.area.includes(search)
    return matchArea && matchSearch
  })

  return (
    <div className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">مكاتب الطباعة</h1>
          <p className="text-gray-500">دليل شركاء JO-PRINT في جميع أنحاء الأردن</p>
        </div>

        <div className="w-full h-52 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl mb-8 flex items-center justify-center border border-blue-200">
          <div className="text-center text-blue-400">
            <div className="text-5xl mb-2">🗺️</div>
            <p className="text-sm font-medium">خريطة مكاتب الطباعة</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم المكتب أو العنوان..."
              className="w-full border border-border rounded-lg pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}
            className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
            {areas.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🏪</div>
            <p>{shops.length === 0 ? 'لا توجد مكاتب مسجلة حالياً' : 'لا توجد نتائج تطابق البحث'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map(shop => (
              <div key={shop.id} className="bg-white border border-border rounded-[12px] p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{shop.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500 text-sm mt-0.5">
                      <Star size={14} fill="currentColor" />
                      <span>{shop.rating}</span>
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{shop.area}</span>
                </div>
                <div className="space-y-1.5 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0" />
                    <span>{shop.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="shrink-0" />
                    <span>{shop.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0" />
                    <a href={`tel:${shop.phone}`} className="text-primary hover:underline">{shop.phone}</a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-3 border-t border-gray-100">
                  {shop.services.map(s => (
                    <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

