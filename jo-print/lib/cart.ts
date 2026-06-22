import type { CartItem } from '@/lib/types'

const KEY = 'jo-print-cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function addToCart(item: Omit<CartItem, 'id'>): CartItem[] {
  const cart = getCart()
  const existing = cart.find(i => i.productId === item.productId && JSON.stringify(i.options) === JSON.stringify(item.options))
  let updated: CartItem[]
  if (existing) {
    updated = cart.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i)
  } else {
    updated = [...cart, { ...item, id: `${item.productId}-${Date.now()}` }]
  }
  saveCart(updated)
  return updated
}

export function removeFromCart(id: string): CartItem[] {
  const updated = getCart().filter(i => i.id !== id)
  saveCart(updated)
  return updated
}

export function clearCart(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY)
}

export function getCartTotal(cart: CartItem[]): { subtotal: number; delivery: number; total: number } {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const delivery = subtotal >= 20 ? 0 : 2.0
  return { subtotal, delivery, total: subtotal + delivery }
}
