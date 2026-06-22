'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/lib/types'
import ProductCard from '@/components/store/ProductCard'
import ProductFilters from '@/components/store/ProductFilters'

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')

  useEffect(() => {
    fetch('/api/admin/products')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        setProducts((data ?? []).map(p => ({
          id: p.id as string,
          name: p.name as string,
          nameEn: p.name_en as string ?? '',
          category: p.category as string,
          price: Number(p.price),
          priceUnit: p.price_unit as string ?? '',
          description: p.description as string ?? '',
          options: Array.isArray(p.options) ? p.options as Product['options'] : [],
          popular: Boolean(p.popular),
          icon: p.icon as string ?? '🖨️',
          color: p.color as string ?? '#1E88E5',
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      return (b.popular ? 1 : 0) - (a.popular ? 1 : 0)
    })

  return (
    <div className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">المتجر</h1>
          <p className="text-gray-500">منتجات مطبوعة مخصصة بجودة عالية</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-56 shrink-0">
            <ProductFilters
              products={products}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              minPrice={0}
              maxPrice={100}
              onPriceChange={() => {}}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{loading ? '...' : `${filtered.length} منتج`}</p>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="popular">الأكثر طلباً</option>
                <option value="price-asc">السعر: الأقل أولاً</option>
                <option value="price-desc">السعر: الأعلى أولاً</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <p>لا توجد منتجات في هذه الفئة</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
