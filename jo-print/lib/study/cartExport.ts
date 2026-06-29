/**
 * JO Study → JO-PRINT cart integration.
 *
 * Builds a print cart-item descriptor for a generated study export.
 * IMPORTANT: this never sets a trusted price. Price is computed server-side by
 * lib/serverPricing.ts at order time from the print options + page count.
 * The cart stores a display price only; the order API ignores it.
 */
import type { CartItem, PrintOptions } from '@/lib/types'
import { calculatePrintPrice } from '@/lib/pricing'
import { STUDY_EXPORT_DEFAULTS } from './config'

export interface StudyExportForCart {
  id: string
  sourceType: 'summary' | 'quiz' | 'answer_key' | 'flashcards' | 'study_plan' | 'booklet'
  title: string
  pageCount: number
  printMode: 'bw' | 'color'
}

// Source types that should default to wire binding (longer booklets).
const BOOKLET_SOURCES = new Set(['booklet', 'study_plan'])

function buildPrintOptions(exp: StudyExportForCart): PrintOptions {
  const isBooklet = BOOKLET_SOURCES.has(exp.sourceType) || exp.pageCount > 30
  return {
    productType: 'paper',
    size: STUDY_EXPORT_DEFAULTS.size,
    color: exp.printMode === 'color' ? 'color' : 'blackwhite',
    sides: STUDY_EXPORT_DEFAULTS.sides,
    paperType: 'standard',
    binding: isBooklet ? STUDY_EXPORT_DEFAULTS.bindingBooklet : STUDY_EXPORT_DEFAULTS.bindingSummary,
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
    notes: `JO Study export: ${exp.title}`,
    // legacy fields
    quantity: 1,
    addCover: false,
    addPageNumbers: false,
    addTOC: false,
  }
}

/**
 * Build the cart item (without id) for a study export.
 * productId is a non-UUID marker so the order API prices it via print rules,
 * not via the products table.
 */
export function buildStudyCartItem(exp: StudyExportForCart): Omit<CartItem, 'id'> {
  const options = buildPrintOptions(exp)
  // Display-only price; the order API recomputes authoritatively.
  const displayPrice = calculatePrintPrice(options, exp.pageCount)

  return {
    productId: `study-export:${exp.sourceType}`,
    name: `طباعة ${exp.title}`,
    price: displayPrice,
    quantity: 1,
    type: 'print',
    // CartItem.options is Record<string,string>; serialize the print options.
    options: serializeOptions(options),
    pageCount: exp.pageCount,
  }
}

/** Flatten PrintOptions into the Record<string,string> shape CartItem expects. */
function serializeOptions(o: PrintOptions): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = String(v)
  }
  return out
}
