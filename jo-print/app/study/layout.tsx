'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { clsx } from 'clsx'

const SUB_NAV = [
  { href: '/study', label: 'الرئيسية', exact: true },
  { href: '/study/files', label: 'ملفاتي' },
  { href: '/study/summaries', label: 'الملخصات' },
  { href: '/study/quizzes', label: 'الاختبارات' },
  { href: '/study/flashcards', label: 'بطاقات الحفظ' },
  { href: '/study/exports', label: 'الطباعة' },
]

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-full bg-surface">
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 pt-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap size={18} aria-hidden="true" />
            </span>
            <h1 className="text-lg font-bold text-gray-900">
              JO Study <span className="text-sm font-normal text-gray-400">— مساعد المذاكرة</span>
            </h1>
          </div>
          <nav
            aria-label="أقسام JO Study"
            className="mt-3 flex gap-1 overflow-x-auto"
          >
            {SUB_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
                className={clsx(
                  'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
                  isActive(item.href, item.exact)
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-primary',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  )
}
