'use client'

import { useState } from 'react'
import type { Product } from '@/lib/types'
import { addToCart } from '@/lib/cart'
import { ShoppingCart, Check } from 'lucide-react'

interface AddToCartButtonProps {
  product: Product
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      type: 'product',
    })
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 border border-gray-200 rounded-lg text-lg hover:border-primary">−</button>
        <span className="w-10 text-center font-semibold">{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 border border-gray-200 rounded-lg text-lg hover:border-primary">+</button>
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
