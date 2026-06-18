'use client'

import { categories } from '@/lib/data/categories'

interface ProductFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  minPrice: number
  maxPrice: number
  onPriceChange: (min: number, max: number) => void
}

export default function ProductFilters({
  selectedCategory,
  onCategoryChange,
}: ProductFiltersProps) {
  return (
    <div className="bg-white rounded-[12px] border border-border p-4">
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
  )
}
