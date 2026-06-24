import { describe, it, expect } from 'vitest'
import { isAllowedOnRoute } from '@/lib/rbac'

describe('isAllowedOnRoute — RBAC permission map', () => {

  // ── customer role ───────────────────────────────────────────────────────────
  it('customer cannot access /admin', () => {
    expect(isAllowedOnRoute('/admin', 'customer')).toBe(false)
  })

  it('customer cannot access /admin/orders', () => {
    expect(isAllowedOnRoute('/admin/orders', 'customer')).toBe(false)
  })

  it('customer cannot access /admin/products', () => {
    expect(isAllowedOnRoute('/admin/products', 'customer')).toBe(false)
  })

  it('customer CAN access public routes (non-admin)', () => {
    expect(isAllowedOnRoute('/store', 'customer')).toBe(true)
    expect(isAllowedOnRoute('/checkout', 'customer')).toBe(true)
    expect(isAllowedOnRoute('/', 'customer')).toBe(true)
  })

  // ── support role ────────────────────────────────────────────────────────────
  it('support can access /admin', () => {
    expect(isAllowedOnRoute('/admin', 'support')).toBe(true)
  })

  it('support can access /admin/orders', () => {
    expect(isAllowedOnRoute('/admin/orders', 'support')).toBe(true)
  })

  it('support can access /admin/customers', () => {
    expect(isAllowedOnRoute('/admin/customers', 'support')).toBe(true)
  })

  it('support CANNOT access /admin/products (prices)', () => {
    expect(isAllowedOnRoute('/admin/products', 'support')).toBe(false)
  })

  it('support CANNOT access /admin/books', () => {
    expect(isAllowedOnRoute('/admin/books', 'support')).toBe(false)
  })

  it('support CANNOT access /admin/shops', () => {
    expect(isAllowedOnRoute('/admin/shops', 'support')).toBe(false)
  })

  // ── production role ─────────────────────────────────────────────────────────
  it('production can access /admin/orders', () => {
    expect(isAllowedOnRoute('/admin/orders', 'production')).toBe(true)
  })

  it('production can access /admin/files', () => {
    expect(isAllowedOnRoute('/admin/files', 'production')).toBe(true)
  })

  it('production CANNOT access /admin/products (prices)', () => {
    expect(isAllowedOnRoute('/admin/products', 'production')).toBe(false)
  })

  it('production CANNOT access /admin/customers', () => {
    expect(isAllowedOnRoute('/admin/customers', 'production')).toBe(false)
  })

  // ── order_manager role ──────────────────────────────────────────────────────
  it('order_manager can access /admin/orders', () => {
    expect(isAllowedOnRoute('/admin/orders', 'order_manager')).toBe(true)
  })

  it('order_manager can access /admin/files', () => {
    expect(isAllowedOnRoute('/admin/files', 'order_manager')).toBe(true)
  })

  it('order_manager CANNOT manage /admin/products', () => {
    expect(isAllowedOnRoute('/admin/products', 'order_manager')).toBe(false)
  })

  it('order_manager CANNOT access /admin/books', () => {
    expect(isAllowedOnRoute('/admin/books', 'order_manager')).toBe(false)
  })

  it('order_manager CANNOT access /admin/teachers', () => {
    expect(isAllowedOnRoute('/admin/teachers', 'order_manager')).toBe(false)
  })

  it('order_manager CANNOT access /admin/shops', () => {
    expect(isAllowedOnRoute('/admin/shops', 'order_manager')).toBe(false)
  })

  // ── admin role (full access) ────────────────────────────────────────────────
  it('admin has full access to all /admin routes', () => {
    const routes = [
      '/admin',
      '/admin/orders',
      '/admin/products',
      '/admin/books',
      '/admin/teachers',
      '/admin/shops',
      '/admin/customers',
      '/admin/files',
      '/admin/orders/123',
      '/admin/products/edit',
    ]
    for (const route of routes) {
      expect(isAllowedOnRoute(route, 'admin'), `expected admin to access ${route}`).toBe(true)
    }
  })

  // ── most-specific prefix wins ───────────────────────────────────────────────
  it('uses the most specific matching prefix', () => {
    // /admin/customers is more specific than /admin — support can access it
    expect(isAllowedOnRoute('/admin/customers/123', 'support')).toBe(true)
    // /admin/products is more specific than /admin — support cannot access it
    expect(isAllowedOnRoute('/admin/products/new', 'support')).toBe(false)
  })

  // ── unknown role falls through ──────────────────────────────────────────────
  it('unknown role cannot access any /admin route', () => {
    expect(isAllowedOnRoute('/admin', 'hacker')).toBe(false)
    expect(isAllowedOnRoute('/admin/orders', '')).toBe(false)
  })
})
