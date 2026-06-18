import { shops } from '@/lib/data/shops'
import { Phone, Clock, Star, MapPin } from 'lucide-react'

export default function ShopsPage() {
  return (
    <div className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">مكاتب الطباعة</h1>
          <p className="text-gray-500">دليل شركاء JO-PRINT في جميع أنحاء الأردن</p>
        </div>

        {/* Map Placeholder */}
        <div className="w-full h-52 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl mb-8 flex items-center justify-center border border-blue-200">
          <div className="text-center text-blue-400">
            <div className="text-5xl mb-2">🗺️</div>
            <p className="text-sm font-medium">خريطة مكاتب الطباعة</p>
          </div>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shops.map(shop => (
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
      </div>
    </div>
  )
}
