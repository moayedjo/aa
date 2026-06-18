import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getFeaturedProducts } from '@/lib/data/products'
import { formatPrice } from '@/lib/pricing'

export default function FeaturedProducts() {
  const products = getFeaturedProducts()

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">المنتجات المميزة</h2>
            <p className="text-gray-500">الأكثر طلباً من عملائنا</p>
          </div>
          <Link href="/store" className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
            عرض الكل <ArrowLeft size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <Link key={product.id} href={`/store/${product.id}`}>
              <div className="bg-white rounded-[12px] border border-border hover:shadow-md transition-shadow p-4">
                <div
                  className="w-full h-32 rounded-lg flex items-center justify-center text-5xl mb-3"
                  style={{ backgroundColor: product.color + '15' }}
                >
                  {product.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-1">{product.description}</p>
                <div className="text-primary font-bold text-sm">
                  من {formatPrice(product.price)} <span className="text-gray-400 font-normal">{product.priceUnit}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
