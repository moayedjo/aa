// Roles in the system
export type AdminRole = 'admin' | 'order_manager' | 'production' | 'support' | 'customer'

// Permission map: path prefix → allowed roles
const ROUTE_PERMISSIONS: Array<{ prefix: string; roles: AdminRole[] }> = [
  // Most restricted first
  { prefix: '/admin/products',  roles: ['admin'] },
  { prefix: '/admin/books',     roles: ['admin'] },
  { prefix: '/admin/teachers',  roles: ['admin'] },
  { prefix: '/admin/shops',     roles: ['admin'] },
  { prefix: '/admin/customers', roles: ['admin', 'support'] },
  { prefix: '/admin/files',     roles: ['admin', 'order_manager', 'production'] },
  { prefix: '/admin/orders',    roles: ['admin', 'order_manager', 'production', 'support'] },
  { prefix: '/admin',           roles: ['admin', 'order_manager', 'production', 'support'] },
]

export function isAllowedOnRoute(path: string, role: string): boolean {
  // Find the most specific (longest prefix) matching route
  const sorted = [...ROUTE_PERMISSIONS].sort((a, b) => b.prefix.length - a.prefix.length)
  const match = sorted.find(r => path.startsWith(r.prefix))
  if (!match) return true // non-admin routes are public
  return (match.roles as string[]).includes(role)
}
