/**
 * Server-side canonical pricing for ALL product types.
 * Never trust client-submitted prices — always compute here.
 */

import type { PrintOptions } from '@/lib/types'

// ── Print pricing constants (mirrors lib/pricing.ts for server use) ──────────
const BASE_PRICES: Record<string, number> = { A4: 0.05, A3: 0.10, Letter: 0.05 }
const COLOR_MULTIPLIER: Record<string, number>  = { color: 3, blackwhite: 1 }
const PAPER_MULTIPLIER: Record<string, number>  = { standard: 1, glossy: 2.5, matte: 2 }
const SIDES_MULTIPLIER: Record<string, number>  = { single: 1, double: 1.8 }
const BINDING_COST: Record<string, number>      = { none: 0, staple: 0.15, wire: 0.75 }
const COVER_COST: Record<string, number>        = { none: 0, transparent: 1, cardboard: 1 }

// Fixed prices for non-document product types
const FIXED_PRICES: Record<string, number> = {
  poster:    5.0,
  rollup:   10.0,
  gradalbum: 15.0,
}

// Delivery threshold: free delivery for orders >= this amount
const FREE_DELIVERY_THRESHOLD = 20.0
const DELIVERY_FEE_STANDARD   = 2.0

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItemInput {
  productId: string
  name: string
  quantity: number
  options?: PrintOptions | Record<string, unknown>
  /** pageCount is required for document print jobs */
  pageCount?: number
}

export interface PricedItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  options: PrintOptions | Record<string, unknown> | null
}

export interface PricingResult {
  items: PricedItem[]
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function computePrintUnitPrice(options: PrintOptions, pageCount: number): number {
  const productType = options.productType

  if (productType === 'poster') {
    return FIXED_PRICES.poster + (options.posterFoamBoard ? 2.0 : 0)
  }
  if (productType === 'rollup')    return FIXED_PRICES.rollup
  if (productType === 'gradalbum') return FIXED_PRICES.gradalbum

  // Standard document print job
  const basePricePerPage = BASE_PRICES[options.size]
  if (basePricePerPage === undefined) throw new Error(`invalid paper size: ${options.size}`)

  const colorMult = COLOR_MULTIPLIER[options.color]
  if (colorMult === undefined) throw new Error(`invalid color option: ${options.color}`)

  const paperMult = PAPER_MULTIPLIER[options.paperType]
  if (paperMult === undefined) throw new Error(`invalid paper type: ${options.paperType}`)

  const sidesMult = SIDES_MULTIPLIER[options.sides]
  if (sidesMult === undefined) throw new Error(`invalid sides option: ${options.sides}`)

  const pricePerPage = basePricePerPage * colorMult * paperMult * sidesMult
  const sheetCount   = options.sides === 'double' ? Math.ceil(pageCount / 2) : pageCount
  const basePrice    = pricePerPage * sheetCount * options.copies

  const bindingCost    = BINDING_COST[options.binding    ?? 'none'] ?? 0
  const customCutCost  = options.customCut ? 1.0 : 0
  const coverFrontCost = COVER_COST[options.coverFront ?? 'none'] ?? 0
  const coverBackCost  = COVER_COST[options.coverBack  ?? 'none'] ?? 0

  return Math.round((basePrice + bindingCost + customCutCost + coverFrontCost + coverBackCost) * 1000) / 1000
}

function isPrintOptions(o: unknown): o is PrintOptions {
  if (!o || typeof o !== 'object') return false
  const opts = o as Record<string, unknown>
  return typeof opts.productType === 'string'
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute server-side price for a single non-DB item (print job, poster, etc.).
 * Throws if the product type is unknown or options are invalid.
 */
export function computeCustomItemPrice(item: CartItemInput): number {
  if (!item.options) throw new Error(`product ${item.productId} has no options`)

  if (!isPrintOptions(item.options)) {
    throw new Error(`unknown product type for item: ${item.productId}`)
  }

  const pageCount = item.pageCount ?? 1
  return computePrintUnitPrice(item.options, pageCount)
}

/**
 * Full server-side pricing pass for an order.
 *
 * @param items           Raw cart items from the request body
 * @param dbPriceMap      { [productId]: canonicalPrice } for DB (UUID) products
 * @param deliveryMethod  'pickup' | 'delivery'
 * @param discountAmount  Coupon discount in JD (already validated server-side)
 */
export function computeOrderPricing(
  items: CartItemInput[],
  dbPriceMap: Record<string, number>,
  deliveryMethod: 'pickup' | 'delivery',
  discountAmount: number,
): PricingResult {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const pricedItems: PricedItem[] = items.map(item => {
    let unitPrice: number

    if (uuidRe.test(item.productId)) {
      // DB product — canonical price must exist in the map
      const canonical = dbPriceMap[item.productId]
      if (canonical === undefined) {
        throw new Error(`product not found: ${item.productId}`)
      }
      unitPrice = canonical
    } else {
      // Custom / print job — compute from options
      unitPrice = computeCustomItemPrice(item)
    }

    return {
      productId:   item.productId,
      productName: item.name,
      quantity:    item.quantity,
      unitPrice,
      lineTotal:   Math.round(unitPrice * item.quantity * 1000) / 1000,
      options:     item.options ?? null,
    }
  })

  const subtotal = Math.round(
    pricedItems.reduce((sum, i) => sum + i.lineTotal, 0) * 1000,
  ) / 1000

  // Delivery: free when subtotal >= threshold
  const deliveryFee =
    deliveryMethod === 'delivery' && subtotal < FREE_DELIVERY_THRESHOLD
      ? DELIVERY_FEE_STANDARD
      : 0

  // Cap discount so total never goes negative
  const clampedDiscount = Math.min(discountAmount, subtotal + deliveryFee)

  const total = Math.round((subtotal + deliveryFee - clampedDiscount) * 1000) / 1000

  return { items: pricedItems, subtotal, deliveryFee, discountAmount: clampedDiscount, total }
}

/**
 * Compute the discount amount for a validated coupon row.
 * Call AFTER you have verified the coupon is valid/active/not expired.
 */
export function computeCouponDiscount(
  coupon: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    maximum_discount: number | null
    minimum_order: number
  },
  subtotal: number,
): number {
  if (subtotal < coupon.minimum_order) return 0

  let discount: number
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((subtotal * coupon.discount_value) / 100 * 1000) / 1000
    if (coupon.maximum_discount !== null) {
      discount = Math.min(discount, coupon.maximum_discount)
    }
  } else {
    discount = coupon.discount_value
  }

  return Math.min(discount, subtotal) // never exceed subtotal
}
