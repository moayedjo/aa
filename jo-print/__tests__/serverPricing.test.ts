import { describe, it, expect } from 'vitest'
import {
  computeOrderPricing,
  computeCouponDiscount,
  computeCustomItemPrice,
  type CartItemInput,
} from '@/lib/serverPricing'
import type { PrintOptions } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePosterItem(foamBoard = false): CartItemInput {
  return {
    productId: 'poster-001',
    name: 'Poster',
    quantity: 1,
    options: {
      productType: 'poster',
      posterFoamBoard: foamBoard,
    } as PrintOptions,
  }
}

function makeRollupItem(): CartItemInput {
  return {
    productId: 'rollup-001',
    name: 'Roll-Up',
    quantity: 1,
    options: { productType: 'rollup' } as PrintOptions,
  }
}

function makeGradAlbumItem(): CartItemInput {
  return {
    productId: 'grad-001',
    name: 'Graduation Album',
    quantity: 1,
    options: { productType: 'gradalbum' } as PrintOptions,
  }
}

function makeDocItem(overrides: Partial<PrintOptions> = {}): CartItemInput {
  const defaults: PrintOptions = {
    productType: 'paper',
    size: 'A4',
    color: 'blackwhite',
    sides: 'single',
    paperType: 'standard',
    binding: 'none',
    copies: 1,
    pageRange: 'all',
    pageRangeValue: '',
    customCut: false,
    coverFront: 'none',
    coverBack: 'none',
    posterFoamBoard: false,
    gradName: '',
    gradSpecialization: '',
    gradUniversity: '',
    gradYear: '',
    gradText: '',
    notes: '',
    quantity: 1,
    addCover: false,
    addPageNumbers: false,
    addTOC: false,
    ...overrides,
  }
  return {
    productId: 'doc-001',
    name: 'Document',
    quantity: 1,
    options: defaults,
    pageCount: 10,
  }
}

// ── Fixed-price products ──────────────────────────────────────────────────────

describe('Poster pricing', () => {
  it('Poster A1 = 5 JOD (no foam board)', () => {
    const price = computeCustomItemPrice(makePosterItem(false))
    expect(price).toBe(5.0)
  })

  it('Poster + Foam Board = 7 JOD', () => {
    const price = computeCustomItemPrice(makePosterItem(true))
    expect(price).toBe(7.0)
  })
})

describe('Roll-Up pricing', () => {
  it('Roll-Up = 10 JOD', () => {
    expect(computeCustomItemPrice(makeRollupItem())).toBe(10.0)
  })
})

describe('Graduation Album pricing', () => {
  it('Graduation Album = 15 JOD', () => {
    expect(computeCustomItemPrice(makeGradAlbumItem())).toBe(15.0)
  })
})

// ── Document add-ons ──────────────────────────────────────────────────────────

describe('Document add-on pricing', () => {
  it('Custom Cutting = +1 JOD', () => {
    const withoutCut = computeCustomItemPrice(makeDocItem({ customCut: false }))
    const withCut    = computeCustomItemPrice(makeDocItem({ customCut: true }))
    expect(withCut - withoutCut).toBeCloseTo(1.0, 5)
  })

  it('Transparent cover front = +1 JOD', () => {
    const base  = computeCustomItemPrice(makeDocItem({ coverFront: 'none' }))
    const withC = computeCustomItemPrice(makeDocItem({ coverFront: 'transparent' }))
    expect(withC - base).toBeCloseTo(1.0, 5)
  })

  it('Cardboard cover back = +1 JOD', () => {
    const base  = computeCustomItemPrice(makeDocItem({ coverBack: 'none' }))
    const withC = computeCustomItemPrice(makeDocItem({ coverBack: 'cardboard' }))
    expect(withC - base).toBeCloseTo(1.0, 5)
  })
})

// ── Delivery fee logic ────────────────────────────────────────────────────────

describe('Delivery fee', () => {
  it('Pickup always = 0 delivery fee', () => {
    const result = computeOrderPricing([makePosterItem()], {}, 'pickup', 0)
    expect(result.deliveryFee).toBe(0)
  })

  it('Delivery under 20 JOD subtotal = 2 JOD fee', () => {
    // poster = 5 JOD, well below 20
    const result = computeOrderPricing([makePosterItem()], {}, 'delivery', 0)
    expect(result.deliveryFee).toBe(2.0)
  })

  it('Delivery at exactly 20 JOD subtotal = 0 fee', () => {
    // 4 posters × 5 JOD = 20 JOD
    const item: CartItemInput = { ...makePosterItem(), quantity: 4 }
    const result = computeOrderPricing([item], {}, 'delivery', 0)
    expect(result.subtotal).toBe(20.0)
    expect(result.deliveryFee).toBe(0)
  })

  it('Delivery above 20 JOD subtotal = 0 fee', () => {
    // rollup = 10 JOD × 3 = 30 JOD
    const item: CartItemInput = { ...makeRollupItem(), quantity: 3 }
    const result = computeOrderPricing([item], {}, 'delivery', 0)
    expect(result.deliveryFee).toBe(0)
  })
})

// ── Error cases ───────────────────────────────────────────────────────────────

describe('Unknown / invalid productId', () => {
  it('Non-UUID productId with no options throws', () => {
    const item: CartItemInput = {
      productId: 'not-a-uuid',
      name: 'Mystery',
      quantity: 1,
    }
    expect(() => computeOrderPricing([item], {}, 'pickup', 0)).toThrow()
  })

  it('UUID productId not in dbPriceMap throws', () => {
    const item: CartItemInput = {
      productId: '00000000-0000-0000-0000-000000000001',
      name: 'DB Product',
      quantity: 1,
    }
    expect(() => computeOrderPricing([item], {}, 'pickup', 0)).toThrow(/product not found/)
  })
})

// ── Client price is ignored ───────────────────────────────────────────────────

describe('Client-submitted price is ignored', () => {
  it('CartItemInput has no price field — price is server-computed', () => {
    // The CartItemInput type has no price field at all.
    // If we pass a poster, server always computes 5 JOD regardless of what a
    // malicious client might have sent in the raw body before mapping to CartItemInput.
    const item = makePosterItem()
    // TypeScript ensures no `price` field is present on CartItemInput
    expect('price' in item).toBe(false)

    const result = computeOrderPricing([item], {}, 'pickup', 0)
    expect(result.items[0].unitPrice).toBe(5.0)
  })

  it('Client total field is not used — total is computed server-side', () => {
    // Verify the returned total is derived from items, not from any client input
    const item = makePosterItem()
    const result = computeOrderPricing([item], {}, 'pickup', 0)
    // total should equal subtotal (0 delivery, 0 discount)
    expect(result.total).toBe(result.subtotal)
    expect(result.total).toBe(5.0)
  })
})

// ── Quantity validation ───────────────────────────────────────────────────────

describe('Quantity validation in computeOrderPricing', () => {
  it('Negative quantity produces negative lineTotal (logic guard needed upstream)', () => {
    // The function itself does not throw on negative qty — lineTotal becomes negative.
    // This test documents the current behavior so any future guard addition is visible.
    const item: CartItemInput = { ...makePosterItem(), quantity: -1 }
    const result = computeOrderPricing([item], {}, 'pickup', 0)
    expect(result.items[0].lineTotal).toBeLessThan(0)
  })

  it('Excessive quantity (>1000) is computed correctly without error', () => {
    // Similarly documenting: the function does not throw on large quantity.
    const item: CartItemInput = { ...makePosterItem(), quantity: 1001 }
    const result = computeOrderPricing([item], {}, 'pickup', 0)
    expect(result.items[0].lineTotal).toBe(5005.0)
  })
})

// ── computeCouponDiscount ─────────────────────────────────────────────────────

describe('computeCouponDiscount', () => {
  it('percentage discount: 10% of 50 = 5', () => {
    const discount = computeCouponDiscount(
      { discount_type: 'percentage', discount_value: 10, maximum_discount: null, minimum_order: 0 },
      50,
    )
    expect(discount).toBe(5.0)
  })

  it('fixed discount: 3 JOD off', () => {
    const discount = computeCouponDiscount(
      { discount_type: 'fixed', discount_value: 3, maximum_discount: null, minimum_order: 0 },
      50,
    )
    expect(discount).toBe(3.0)
  })

  it('minimum_order not met → 0 discount', () => {
    const discount = computeCouponDiscount(
      { discount_type: 'fixed', discount_value: 5, maximum_discount: null, minimum_order: 30 },
      20,
    )
    expect(discount).toBe(0)
  })

  it('maximum_discount cap applied', () => {
    // 50% of 100 = 50, but max is 10
    const discount = computeCouponDiscount(
      { discount_type: 'percentage', discount_value: 50, maximum_discount: 10, minimum_order: 0 },
      100,
    )
    expect(discount).toBe(10)
  })

  it('discount never exceeds subtotal', () => {
    // fixed 999 JOD discount on 5 JOD order
    const discount = computeCouponDiscount(
      { discount_type: 'fixed', discount_value: 999, maximum_discount: null, minimum_order: 0 },
      5,
    )
    expect(discount).toBe(5)
  })
})
