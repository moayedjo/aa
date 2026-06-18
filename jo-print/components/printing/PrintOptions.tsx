'use client'

import type { PrintOptions } from '@/lib/types'
import { calculatePrintPrice, formatPrice } from '@/lib/pricing'

interface PrintOptionsProps {
  options: PrintOptions
  onChange: (options: PrintOptions) => void
  pageCount: number
}

export default function PrintOptionsForm({ options, onChange, pageCount }: PrintOptionsProps) {
  const update = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
    onChange({ ...options, [key]: value })
  }

  const total = calculatePrintPrice(options, pageCount)

  return (
    <div className="space-y-5">
      {/* Size */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">حجم الورقة</label>
        <div className="flex gap-2">
          {(['A4', 'A3', 'Letter'] as const).map(size => (
            <button
              key={size}
              onClick={() => update('size', size)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                options.size === size ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">اللون</label>
        <div className="flex gap-2">
          <button
            onClick={() => update('color', 'color')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              options.color === 'color' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
            }`}
          >
            🌈 ألوان
          </button>
          <button
            onClick={() => update('color', 'blackwhite')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              options.color === 'blackwhite' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
            }`}
          >
            ⬛ أبيض وأسود
          </button>
        </div>
      </div>

      {/* Sides */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">الطباعة</label>
        <div className="flex gap-2">
          <button
            onClick={() => update('sides', 'single')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              options.sides === 'single' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
            }`}
          >
            وجه واحد
          </button>
          <button
            onClick={() => update('sides', 'double')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              options.sides === 'double' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
            }`}
          >
            وجهين
          </button>
        </div>
      </div>

      {/* Paper Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الورق</label>
        <div className="flex gap-2">
          {[
            { key: 'standard', label: 'عادي' },
            { key: 'glossy', label: 'لامع' },
            { key: 'matte', label: 'مطفي' },
          ].map(type => (
            <button
              key={type.key}
              onClick={() => update('paperType', type.key as PrintOptions['paperType'])}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                options.paperType === type.key ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Copies */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">عدد النسخ</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update('copies', Math.max(1, options.copies - 1))}
            className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center text-lg hover:border-primary"
          >
            −
          </button>
          <span className="w-12 text-center font-semibold">{options.copies}</span>
          <button
            onClick={() => update('copies', options.copies + 1)}
            className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center text-lg hover:border-primary"
          >
            +
          </button>
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">السعر الإجمالي التقديري</span>
          <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          بناءً على {pageCount} صفحة × {options.copies} نسخة
        </p>
      </div>
    </div>
  )
}
