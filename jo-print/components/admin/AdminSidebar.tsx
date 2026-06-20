'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/admin', label: 'لوحة التحكم', icon: '📊' },
  { href: '/admin/orders', label: 'الطلبات', icon: '📦' },
  { href: '/admin/products', label: 'المنتجات', icon: '🛍️' },
  { href: '/admin/files', label: 'ملفات الطباعة', icon: '📁' },
  { href: '/admin/customers', label: 'العملاء', icon: '👥' },
  { href: '/admin/books', label: 'ملخصات الكتب', icon: '📚' },
  { href: '/admin/teachers', label: 'المعلمون', icon: '🎓' },
  { href: '/admin/shops', label: 'مكاتب الطباعة', icon: '🏪' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-l border-border flex flex-col min-h-screen">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-white font-bold px-2.5 py-1 rounded-lg text-sm">JO</span>
          <div>
            <div className="font-bold text-gray-900 text-sm">PRINT Admin</div>
            <div className="text-xs text-gray-400">لوحة الإدارة</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(link => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-surface'
              }`}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-surface transition-colors mb-1">
          <span>🌐</span><span>الموقع الرئيسي</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <span>🚪</span><span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}
