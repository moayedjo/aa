'use client'

import { useState } from 'react'
import type { Product } from '@/lib/types'
import { addToCart } from '@/lib/cart'
import { ShoppingCart, Check, AlertCircle } from 'lucide-react'

interface AddToCartButtonProps {
  product: Product
  selectedOptions?: Record<string, string>
  /** options إضافية من متطلبات المنتج (تعليمات، ملف، نصوص) */
  extraOptions?: Record<string, string>
  /** يُستدعى قبل الإضافة؛ يعيد رسالة خطأ عربية أو null إذا كان كل شيء مكتملاً */
  validate?: () => string | null
}

export default function AddToCartButton({ product, selectedOptions, extraOptions, validate }: AddToCartButtonProps) {
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    if (validate) {
      const msg = validate()
      if (msg) { setError(msg); return }
    }
    setError(null)

    const options: Record<string, string> = { ...(selectedOptions ?? {}), ...(extraOptions ?? {}) }

    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      type: 'product',
      options: Object.keys(options).length > 0 ? options : undefined,
    })
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div>
      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm mb-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="تقليل الكمية" className="w-10 h-10 border border-gray-200 rounded-lg text-lg hover:border-primary">−</button>
        <span className="w-10 text-center font-semibold">{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)} aria-label="زيادة الكمية" className="w-10 h-10 border border-gray-200 rounded-lg text-lg hover:border-primary">+</button>
      </div>
      <button
        onClick={handleAdd}
        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
          added ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'
        }`}
      >
        {added ? <><Check size={18} /> تم الإضافة للسلة</> : <><ShoppingCart size={18} /> أضف للسلة</>}
      </button>
    </div>
  )
}
