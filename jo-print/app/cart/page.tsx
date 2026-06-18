'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import type { CartItem } from '@/lib/types'

const initialCart: CartItem[] = [
  { id: 'c1', productId: 'business-cards', name: 'بطاقات عمل', price: 3.50, quantity: 2 },
  { id: 'c2', productId: 'tshirts', name: 'تيشيرت مطبوع', price: 12.00, quantity: 1 },
]

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>(initialCart)

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(i => i.id !== id))
    } else {
      setCart(cart.map(i => i.id === id ? { ...i, quantity: qty } : i))
    }
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const delivery = subtotal > 20 ? 0 : 2.00
  const total = subtotal + delivery

  if (cart.length === 0) {
    return (
      <div className="py-20 px-4 text-center">
        <ShoppingBag size={60} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">سلة التسوق فارغة</h2>
        <p className="text-gray-500 mb-6">لم تضف أي منتجات بعد</p>
        <Link href="/store" className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark inline-block">
          تصفح المتجر
        </Link>
      </div>
    )
  }

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">سلة التسوق</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="bg-white border border-border rounded-[12px] p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center text-2xl">🛍️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-primary font-bold">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-8 h-8 border border-gray-200 rounded-lg text-sm hover:border-primary">−</button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-8 h-8 border border-gray-200 rounded-lg text-sm hover:border-primary">+</button>
                </div>
                <button onClick={() => updateQty(item.id, 0)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white border border-border rounded-[12px] p-5 h-fit">
            <h2 className="font-bold text-gray-900 mb-4">ملخص الطلب</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">التوصيل</span>
                <span>{delivery === 0 ? 'مجاناً' : formatPrice(delivery)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100">
                <span>الإجمالي</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
            {delivery > 0 && (
              <p className="text-xs text-gray-400 mb-3">أضف {formatPrice(20 - subtotal)} للحصول على توصيل مجاني</p>
            )}
            <Link href="/checkout" className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-center block hover:bg-primary-dark transition-colors">
              إتمام الشراء
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
