'use client'
export const dynamic = 'force-dynamic'
import { products } from '@/lib/data/products'

export default function AdminProducts() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة المنتجات</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + إضافة منتج
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${product.color}`}>
              {product.icon}
            </div>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-gray-900">{product.name}</h3>
              {product.popular && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">شائع</span>}
            </div>
            <p className="text-xs text-gray-500 mb-3">{product.category}</p>
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold">من {product.price.toFixed(3)} د.أ</span>
              <div className="flex gap-2">
                <button className="text-xs text-gray-500 hover:text-primary transition-colors">تعديل</button>
                <button className="text-xs text-red-400 hover:text-red-600 transition-colors">حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
