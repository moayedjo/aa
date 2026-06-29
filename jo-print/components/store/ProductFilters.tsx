'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/lib/types'

const CATEGORY_META: Record<string, { name: string; icon: string }> = {
  all:          { name: 'الكل',          icon: '🗂️' },
  printing:     { name: 'طباعة',          icon: '🖨️' },
  'large-format': { name: 'طباعة كبيرة', icon: '🎌' },
  store:        { name: 'المتجر',         icon: '🛍️' },
  design:       { name: 'تصميم',          icon: '🎨' },
  binding:      { name: 'تجليد',          icon: '📚' },
}

interface ProductFiltersProps {
  products: Product[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  minPrice: number
  maxPrice: number
  priceRange: [number, number]
  onPriceChange: (min: number, max: number) => void
}

export default function ProductFilters({
  products,
  selectedCategory,
  onCategoryChange,
  minPrice,
  maxPrice,
  priceRange,
  onPriceChange,
}: ProductFiltersProps) {
  const [localMin, setLocalMin] = useState(String(priceRange[0]))
  const [localMax, setLocalMax] = useState(String(priceRange[1]))

  useEffect(() => {
    setLocalMin(String(priceRange[0]))
    setLocalMax(String(priceRange[1]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange[0], priceRange[1]])

  const categoryCounts = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})

  const categories = [
    { id: 'all', name: 'الكل', icon: '🗂️', count: products.length },
    ...Object.entries(categoryCounts).map(([id, count]) => ({
      id,
      name: CATEGORY_META[id]?.name ?? id,
      icon: CATEGORY_META[id]?.icon ?? '📦',
      count,
    })),
  ]

  const applyPrice = () => {
    const min = Math.max(minPrice, Math.min(Number(localMin) || minPrice, Number(localMax) || maxPrice))
    const max = Math.min(maxPrice, Math.max(Number(localMax) || maxPrice, min))
    onPriceChange(min, max)
  }

  const reset = () => {
    setLocalMin(String(minPrice))
    setLocalMax(String(maxPrice))
    onPriceChange(minPrice, maxPrice)
  }

  const isPriceFiltered = priceRange[0] > minPrice || priceRange[1] < maxPrice

  return (
    <div className="bg-white rounded-[12px] border border-border p-4 space-y-5">
      <div>
        <h3 className="font-bold text-gray-900 mb-4">الفئات</h3>
        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-right ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-sm">نطاق السعر</h3>
          {isPriceFiltered && (
            <button onClick={reset} className="text-xs text-primary hover:underline">إعادة تعيين</button>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">من (د.أ)</label>
            <input
              type="number"
              min={minPrice}
              max={maxPrice}
              value={localMin}
              onChange={e => setLocalMin(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={e => e.key === 'Enter' && applyPrice()}
              className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="text-gray-400 mt-5">–</span>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">إلى (د.أ)</label>
            <input
              type="number"
              min={minPrice}
              max={maxPrice}
              value={localMax}
              onChange={e => setLocalMax(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={e => e.key === 'Enter' && applyPrice()}
              className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <button
          onClick={applyPrice}
          className="w-full bg-primary/10 text-primary text-sm py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium"
        >
          تطبيق
        </button>
      </div>
    </div>
  )
}
