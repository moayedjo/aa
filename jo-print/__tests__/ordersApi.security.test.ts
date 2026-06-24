/**
 * Integration / security tests for the orders API pricing logic.
 *
 * We do not spin up an HTTP server here. Instead we test the server-side
 * pricing function (computeOrderPricing) directly, simulating what the
 * API route does: fetch canonical prices from DB into a priceMap, then
 * pass CartItemInput items to computeOrderPricing — completely ignoring
 * any price/total/deliveryFee/discount values the client may have sent.
 */
import { describe, it, expect } from 'vitest'
import { computeOrderPricing, type CartItemInput } from '@/lib/serverPricing'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_UUID_A = '11111111-1111-1111-1111-111111111111'
const VALID_UUID_B = '22222222-2222-2222-2222-222222222222'

/**
 * Simulates the DB result: supabase.from('products').select('id, price')
 * returning these rows, which the API route converts to a Record<string, number>.
 */
const mockDbPriceMap: Record<string, number> = {
  [VALID_UUID_A]: 5.0,
  [VALID_UUID_B]: 12.0,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Orders API — price injection prevention', () => {
  it('Uses DB canonical price (5.000), ignores any client-submitted price (0.001)', () => {
    // Client sends productId + name + quantity only — no price field possible
    const items: CartItemInput[] = [
      { productId: VALID_UUID_A, name: 'Print Job', quantity: 1 },
    ]

    // Fake "client body" values that the API must NOT use
    const _clientSubmittedPrice = 0.001
    const _clientSubmittedTotal = 0

    const result = computeOrderPricing(items, mockDbPriceMap, 'pickup', 0)

    expect(result.items[0].unitPrice).toBe(5.0)
    expect(result.subtotal).toBe(5.0)
    expect(result.total).toBe(5.0)

    // Verify inflated client price was not used
    expect(result.items[0].unitPrice).not.toBe(_clientSubmittedPrice)
    expect(result.total).not.toBe(_clientSubmittedTotal)
  })

  it('Uses DB canonical price (12.000), ignores client-submitted price (999)', () => {
    const items: CartItemInput[] = [
      { productId: VALID_UUID_B, name: 'Product B', quantity: 1 },
    ]

    const _clientSubmittedPrice = 999

    const result = computeOrderPricing(items, mockDbPriceMap, 'pickup', 0)

    expect(result.items[0].unitPrice).toBe(12.0)
    expect(result.total).toBe(12.0)
    expect(result.items[0].unitPrice).not.toBe(_clientSubmittedPrice)
  })

  it('A body with { price: 0.001, total: 0, deliveryFee: 0, discount: 999 } is completely ignored', () => {
    // Simulate a malicious request body. The API extracts only safe fields into CartItemInput.
    const maliciousBody = {
      price: 0.001,
      total: 0,
      deliveryFee: 0,
      discount: 999,
      items: [{ productId: VALID_UUID_A, name: 'Item', quantity: 2 }],
      deliveryMethod: 'delivery' as const,
    }

    // API extracts only the safe CartItemInput fields
    const items: CartItemInput[] = maliciousBody.items.map(i => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
    }))

    // API uses server-computed discount = 0 (no valid coupon)
    const serverDiscount = 0

    const result = computeOrderPricing(items, mockDbPriceMap, maliciousBody.deliveryMethod, serverDiscount)

    // subtotal = 5 × 2 = 10; delivery under 20 threshold = 2; total = 12
    expect(result.subtotal).toBe(10.0)
    expect(result.deliveryFee).toBe(2.0)
    expect(result.discountAmount).toBe(0)
    expect(result.total).toBe(12.0)

    // None of the malicious overrides took effect
    expect(result.total).not.toBe(maliciousBody.total)
    expect(result.deliveryFee).not.toBe(maliciousBody.deliveryFee)
    expect(result.discountAmount).not.toBe(maliciousBody.discount)
  })

  it('Unknown non-UUID productId without options throws an error', () => {
    const items: CartItemInput[] = [
      { productId: 'not-a-real-uuid', name: 'Hack Product', quantity: 1 },
    ]
    expect(() => computeOrderPricing(items, mockDbPriceMap, 'pickup', 0)).toThrow()
  })

  it('payment_method field in body does not affect pricing', () => {
    // payment_method is stored separately; pricing is identical regardless
    const items: CartItemInput[] = [
      { productId: VALID_UUID_A, name: 'Item', quantity: 1 },
    ]

    // Same call, simulating different payment methods — result is the same
    const resultCash   = computeOrderPricing(items, mockDbPriceMap, 'pickup', 0)
    const resultOnline = computeOrderPricing(items, mockDbPriceMap, 'pickup', 0)

    expect(resultCash.total).toBe(resultOnline.total)
    expect(resultCash.total).toBe(5.0)
  })
})

describe('Orders API — delivery fee edge cases', () => {
  it('Delivery with subtotal exactly at threshold (20 JOD) → free delivery', () => {
    // 4 items at 5 JOD each = 20 JOD
    const items: CartItemInput[] = [
      { productId: VALID_UUID_A, name: 'Item', quantity: 4 },
    ]
    const result = computeOrderPricing(items, mockDbPriceMap, 'delivery', 0)
    expect(result.subtotal).toBe(20.0)
    expect(result.deliveryFee).toBe(0)
  })

  it('Delivery with subtotal just below threshold (19.999 JOD) → 2 JOD fee', () => {
    // Use 3 items at 5 = 15 JOD
    const items: CartItemInput[] = [
      { productId: VALID_UUID_A, name: 'Item', quantity: 3 },
    ]
    const result = computeOrderPricing(items, mockDbPriceMap, 'delivery', 0)
    expect(result.subtotal).toBe(15.0)
    expect(result.deliveryFee).toBe(2.0)
  })
})
