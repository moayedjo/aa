import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAllowedOnRoute } from '@/lib/rbac'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = { title: 'JO-PRINT | لوحة الإدارة' }

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side second layer of defense (middleware is the first layer)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Use /admin as base path check for layout-level protection
  if (!profile || !isAllowedOnRoute('/admin', profile.role as string)) {
    redirect('/?error=access_denied')
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-surface" dir="rtl">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </AdminGuard>
  )
}
