'use client'

import { useState } from 'react'
import { products } from '@/lib/data/products'
import ProductCard from '@/components/store/ProductCard'
import ProductFilters from '@/components/store/ProductFilters'

export default function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')

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
          {/* Sidebar */}
          <div className="lg:w-56 shrink-0">
            <ProductFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              minPrice={0}
              maxPrice={100}
              onPriceChange={() => {}}
            />
          </div>

          {/* Products */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{filtered.length} منتج</p>
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
