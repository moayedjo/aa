import { describe, it, expect } from 'vitest'

/**
 * Validates the payment-method and payment-status enforcement rules
 * by exercising the same logic the API route applies.
 */

// Mirror the same validation logic used in app/api/orders/route.ts
function validatePaymentFields(b: Record<string, unknown>): string | null {
  if (b.paymentMethod && b.paymentMethod !== 'cash_on_delivery' && b.paymentMethod !== 'cash') {
    return 'طريقة الدفع غير متاحة حالياً — الدفع نقداً عند الاستلام فقط'
  }
  if (b.payment_status === 'paid' || b.paymentStatus === 'paid') {
    return 'لا يمكن تعيين حالة الدفع يدوياً'
  }
  return null
}

describe('Cash on Delivery enforcement', () => {

  it('accepts cash_on_delivery', () => {
    expect(validatePaymentFields({ paymentMethod: 'cash_on_delivery' })).toBeNull()
  })

  it('accepts legacy "cash" alias', () => {
    expect(validatePaymentFields({ paymentMethod: 'cash' })).toBeNull()
  })

  it('accepts when paymentMethod is omitted entirely', () => {
    expect(validatePaymentFields({})).toBeNull()
  })

  it('rejects card payment', () => {
    const err = validatePaymentFields({ paymentMethod: 'card' })
    expect(err).not.toBeNull()
    expect(err).toContain('نقداً')
  })

  it('rejects zain_cash', () => {
    expect(validatePaymentFields({ paymentMethod: 'zain_cash' })).not.toBeNull()
  })

  it('rejects orange_money', () => {
    expect(validatePaymentFields({ paymentMethod: 'orange_money' })).not.toBeNull()
  })

  it('rejects cliq', () => {
    expect(validatePaymentFields({ paymentMethod: 'cliq' })).not.toBeNull()
  })

  it('rejects efawateer', () => {
    expect(validatePaymentFields({ paymentMethod: 'efawateer' })).not.toBeNull()
  })

  it('rejects payment_status=paid (snake_case)', () => {
    const err = validatePaymentFields({ payment_status: 'paid' })
    expect(err).not.toBeNull()
    expect(err).toContain('حالة الدفع')
  })

  it('rejects paymentStatus=paid (camelCase)', () => {
    const err = validatePaymentFields({ paymentStatus: 'paid' })
    expect(err).not.toBeNull()
  })

  it('allows paymentStatus=pending (normal value)', () => {
    expect(validatePaymentFields({ paymentStatus: 'pending' })).toBeNull()
  })
})
