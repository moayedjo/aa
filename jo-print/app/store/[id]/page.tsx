'use client'

import { notFound } from 'next/navigation'
import { useState } from 'react'
import { getProductById } from '@/lib/data/products'
import { formatPrice } from '@/lib/pricing'
import AddToCartButton from '@/components/store/AddToCartButton'

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id)
  if (!product) notFound()

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    product.options?.forEach(opt => { defaults[opt.label] = opt.values[0] })
    return defaults
  })

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Product Image */}
          <div
            className="w-full aspect-square rounded-2xl flex items-center justify-center text-8xl"
            style={{ backgroundColor: product.color + '15' }}
          >
            {product.icon}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-500 mb-4 leading-relaxed">{product.description}</p>

            <div className="text-3xl font-bold text-primary mb-6">
              {formatPrice(product.price)}
              <span className="text-base text-gray-400 font-normal mr-2">{product.priceUnit}</span>
            </div>

            {/* Options */}
            {product.options?.map(option => (
              <div key={option.name} className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {option.label}
                  {selectedOptions[option.label] && (
                    <span className="mr-2 text-primary font-normal">: {selectedOptions[option.label]}</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {option.values.map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [option.label]: value }))}
                      className={`px-3 py-1.5 border-2 rounded-lg text-sm transition-colors ${
                        selectedOptions[option.label] === value
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <AddToCartButton product={product} selectedOptions={selectedOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}
