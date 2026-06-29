import type { PrintOptions } from '@/lib/types'

const BASE_PRICES = { A4: 0.05, A3: 0.10, Letter: 0.05 }
const COLOR_MULTIPLIER = { color: 3, blackwhite: 1 }
const PAPER_MULTIPLIER = { standard: 1, glossy: 2.5, matte: 2 }
const SIDES_MULTIPLIER = { single: 1, double: 1.8 }
const BINDING_COST: Record<string, number> = { none: 0, staple: 0.15, wire: 0.75 }
const COVER_COST: Record<string, number> = { none: 0, transparent: 1, cardboard: 1 }

export function calculatePrintPrice(options: PrintOptions, pageCount: number): number {
  if (options.productType === 'poster') return 5 + (options.posterFoamBoard ? 2 : 0)
  if (options.productType === 'rollup') return 10
  if (options.productType === 'gradalbum') return 15

  // paper
  const basePricePerPage = BASE_PRICES[options.size] ?? 0.05
  const colorMult = COLOR_MULTIPLIER[options.color] ?? 1
  const paperMult = PAPER_MULTIPLIER[options.paperType] ?? 1
  const sidesMult = SIDES_MULTIPLIER[options.sides] ?? 1

  const pricePerPage = basePricePerPage * colorMult * paperMult * sidesMult
  const sheetCount = options.sides === 'double' ? Math.ceil(pageCount / 2) : pageCount
  const basePrice = pricePerPage * sheetCount * options.copies

  const bindingCost = BINDING_COST[options.binding ?? 'none'] ?? 0
  const customCutCost = options.customCut ? 1 : 0
  const coverFrontCost = COVER_COST[options.coverFront ?? 'none'] ?? 0
  const coverBackCost = COVER_COST[options.coverBack ?? 'none'] ?? 0

  return Math.round((basePrice + bindingCost + customCutCost + coverFrontCost + coverBackCost) * 1000) / 1000
}

export function formatPrice(price: number): string {
  return `${price.toFixed(3)} د.أ`
}

export function getQuantityDiscount(quantity: number): number {
  if (quantity >= 1000) return 0.20
  if (quantity >= 500)  return 0.15
  if (quantity >= 100)  return 0.10
  return 0
}
