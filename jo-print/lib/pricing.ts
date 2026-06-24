import type { PrintOptions } from '@/lib/types'

const BASE_PRICES = {
  A4: 0.05,
  A3: 0.10,
  Letter: 0.05,
}

const COLOR_MULTIPLIER = {
  color: 3,
  blackwhite: 1,
}

const PAPER_MULTIPLIER = {
  standard: 1,
  glossy: 2.5,
  matte: 2,
}

const SIDES_MULTIPLIER = {
  single: 1,
  double: 1.8,
}

export function calculatePrintPrice(options: PrintOptions & { binding?: string; addCover?: boolean; addPageNumbers?: boolean; addTOC?: boolean }, pageCount: number): number {
  const basePricePerPage = BASE_PRICES[options.size]
  const colorMult = COLOR_MULTIPLIER[options.color]
  const paperMult = PAPER_MULTIPLIER[options.paperType]
  const sidesMult = SIDES_MULTIPLIER[options.sides]

  const pricePerPage = basePricePerPage * colorMult * paperMult * sidesMult
  const totalPages = options.sides === 'double' ? Math.ceil(pageCount / 2) : pageCount

  const basePrice = pricePerPage * totalPages * options.copies

  // Binding cost
  const BINDING_COST: Record<string, number> = { none: 0, staple: 0.15, spiral: 0.75, luxury: 2.5 }
  const bindingCost = BINDING_COST[options.binding ?? 'none'] ?? 0

  // Extras cost
  const coverCost = options.addCover ? 0.25 : 0
  const pageNumCost = options.addPageNumbers ? 0.10 : 0
  const tocCost = options.addTOC ? 0.20 : 0

  return Math.round((basePrice + bindingCost + coverCost + pageNumCost + tocCost) * 1000) / 1000
}

export function formatPrice(price: number): string {
  return `${price.toFixed(2)} د.أ`
}

export function getQuantityDiscount(quantity: number): number {
  if (quantity >= 1000) return 0.20
  if (quantity >= 500) return 0.15
  if (quantity >= 100) return 0.10
  return 0
}
