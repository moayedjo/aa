'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Menu, X, User, Phone } from 'lucide-react'
import { getCart } from '@/lib/cart'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const updateCart = () => {
      const cart = getCart()
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0))
    }
    updateCart()
    window.addEventListener('storage', updateCart)
    window.addEventListener('cart-updated', updateCart)
    return () => {
      window.removeEventListener('storage', updateCart)
      window.removeEventListener('cart-updated', updateCart)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navLinks = [
    { href: '/', label: 'الرئيسية' },
    { href: '/printing', label: 'خدمات الطباعة' },
    { href: '/store', label: 'المتجر' },
    { href: '/books', label: 'ملخصات الكتب' },
    { href: '/teachers', label: 'المعلمين' },
    { href: '/shops', label: 'مكاتب الطباعة' },
  ]

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JO</span>
            </div>
            <span className="text-primary font-bold text-xl">PRINT</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-primary transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="tel:+96279123456"
              className="hidden md:flex items-center gap-1 text-sm text-gray-600 hover:text-primary"
            >
              <Phone size={15} />
              <span>0791234567</span>
            </a>
            <Link href="/cart" className="relative p-2 text-gray-600 hover:text-primary">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-primary text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href={isLoggedIn ? '/account' : '/auth'}
              className="hidden md:flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-dark transition-colors"
            >
              <User size={15} />
              <span>{isLoggedIn ? 'حسابي' : 'دخول'}</span>
            </Link>
            <button
              className="lg:hidden p-2 text-gray-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 py-3 pb-4">
            <nav className="flex flex-col gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={isLoggedIn ? '/account' : '/auth'}
                className="mx-3 mt-2 text-center bg-primary text-white py-2 rounded-lg text-sm"
                onClick={() => setMenuOpen(false)}
              >
                {isLoggedIn ? 'حسابي' : 'تسجيل الدخول'}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
