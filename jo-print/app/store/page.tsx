'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/lib/types'
import ProductCard from '@/components/store/ProductCard'
import ProductFilters from '@/components/store/ProductFilters'
import Link from 'next/link'

const CUSTOM_PRODUCTS = [
  { type: 'mug',     icon: '☕', name: 'طباعة على مج',       price: '5.000 د.أ', desc: 'اسمك أو صورتك على مج سيراميك', badge: 'هدية مميزة' },
  { type: 'poster',  icon: '🖼️', name: 'بوستر مخصص',         price: 'من 3.000 د.أ', desc: 'A4 حتى A1 — ارفع تصميمك', badge: '' },
  { type: 'shield',  icon: '🏆', name: 'درع تذكاري',          price: '15.000 د.أ', desc: 'تكريم وتقدير باسمك وشعارك', badge: 'للمؤسسات' },
  { type: 'tshirt',  icon: '👕', name: 'طباعة على تيشيرت',   price: '8.000 د.أ', desc: 'اسم أو تصميم على قطن 100%', badge: '' },
]

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100])

  useEffect(() => {
    fetch('/api/products')
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

  const allPrices = products.map(p => p.price)
  const globalMin = allPrices.length ? Math.floor(Math.min(...allPrices)) : 0
  const globalMax = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 100

  const filtered = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
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

        {/* Custom / personalizable products */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900">🎨 منتجات مخصصة</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">أضف اسمك أو صورتك</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CUSTOM_PRODUCTS.map(p => (
              <Link key={p.type} href={`/store/custom/${p.type}`}
                className="bg-white border border-border rounded-2xl p-4 hover:shadow-md hover:border-primary/30 transition-all group">
                <div className="text-4xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">{p.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-primary font-semibold text-sm">{p.price}</span>
                  {p.badge && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-56 shrink-0">
            <ProductFilters
              products={products}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              minPrice={globalMin}
              maxPrice={globalMax}
              priceRange={priceRange}
              onPriceChange={(min, max) => setPriceRange([min, max])}
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

