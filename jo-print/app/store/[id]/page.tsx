'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import type { Product } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'
import AddToCartButton from '@/components/store/AddToCartButton'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/products')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        const found = data.find(p => p.id === id)
        if (!found) { setMissing(true); setLoading(false); return }
        const p: Product = {
          id: found.id as string,
          name: found.name as string,
          nameEn: found.name_en as string ?? '',
          category: found.category as string,
          price: Number(found.price),
          priceUnit: found.price_unit as string ?? '',
          description: found.description as string ?? '',
          icon: found.icon as string ?? '🖨️',
          color: found.color as string ?? '#1E88E5',
          popular: Boolean(found.popular),
          options: Array.isArray(found.options) ? found.options as Product['options'] : [],
        }
        const defaults: Record<string, string> = {}
        ;(p.options ?? []).forEach(opt => { if (opt.values[0]) defaults[opt.label] = opt.values[0] })
        setSelectedOptions(defaults)
        setProduct(p)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (missing) notFound()
  if (!product) return null

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-8">
          <Link href="/store" className="hover:text-primary">المتجر</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div
            className="w-full aspect-square rounded-2xl flex items-center justify-center text-8xl"
            style={{ backgroundColor: product.color + '15' }}
          >
            {product.icon}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-500 mb-4 leading-relaxed">{product.description}</p>

            <div className="text-3xl font-bold text-primary mb-6">
              {formatPrice(product.price)}
              <span className="text-base text-gray-400 font-normal mr-2">{product.priceUnit}</span>
            </div>

            {(product.options ?? []).map(option => (
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
