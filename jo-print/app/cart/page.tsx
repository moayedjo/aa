'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trash2, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import { getCart, saveCart, getCartTotal } from '@/lib/cart'
import type { CartItem } from '@/lib/types'

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setCart(getCart())
    setMounted(true)
  }, [])

  const updateQty = (id: string, qty: number) => {
    const updated = cart.map(i => i.id === id ? { ...i, quantity: qty } : i).filter(i => i.quantity > 0)
    setCart(updated)
    saveCart(updated)
  }

  const removeItem = (id: string, name: string) => {
    if (!confirm(`هل تريد حذف "${name}" من السلة؟`)) return
    const updated = cart.filter(i => i.id !== id)
    setCart(updated)
    saveCart(updated)
    window.dispatchEvent(new Event('cart-updated'))
  }

  const { subtotal, delivery, total } = getCartTotal(cart)

  if (!mounted) return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (cart.length === 0) {
    return (
      <div className="py-24 px-4 text-center">
        <ShoppingBag size={60} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">سلة التسوق فارغة</h2>
        <p className="text-gray-500 mb-6">لم تضف أي منتجات بعد</p>
        <Link href="/store" className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 inline-block transition-colors">
          تصفح المتجر
        </Link>
      </div>
    )
  }

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">سلة التسوق ({cart.length})</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="bg-white border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/5 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🛍️</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                  {item.options && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Object.values(item.options).join(' · ')}
                    </p>
                  )}
                  <p className="text-primary font-bold mt-1">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-8 h-8 border border-gray-200 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors text-sm font-bold">−</button>
                  <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-8 h-8 border border-gray-200 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors text-sm font-bold">+</button>
                </div>
                <div className="text-right flex-shrink-0 mr-2">
                  <p className="font-bold text-gray-900 text-sm">{formatPrice(item.price * item.quantity)}</p>
                </div>
                <button onClick={() => removeItem(item.id, item.name)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" aria-label="حذف المنتج">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white border border-border rounded-xl p-5 h-fit sticky top-4">
            <h2 className="font-bold text-gray-900 mb-4">ملخص الطلب</h2>
            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>التوصيل</span>
                <span className={delivery === 0 ? 'text-green-600 font-medium' : ''}>{delivery === 0 ? 'مجاناً 🎉' : formatPrice(delivery)}</span>
              </div>
              {delivery > 0 && (
                <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  أضف {formatPrice(20 - subtotal)} للحصول على توصيل مجاني
                </p>
              )}
              <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100">
                <span>الإجمالي</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-center block hover:bg-blue-700 transition-colors"
            >
              إتمام الشراء ←
            </Link>
            <Link href="/store" className="w-full text-center text-sm text-gray-500 hover:text-primary mt-3 block transition-colors">
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
