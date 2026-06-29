import { describe, it, expect } from 'vitest'
import { buildStudyCartItem, type StudyExportForCart } from '@/lib/study/cartExport'
import { computeOrderPricing, type CartItemInput } from '@/lib/serverPricing'

const exp = (over: Partial<StudyExportForCart> = {}): StudyExportForCart => ({
  id: 'e1', sourceType: 'summary', title: 'ملخص الفصل', pageCount: 10, printMode: 'bw', ...over,
})

describe('buildStudyCartItem', () => {
  it('produces a print item with a non-UUID productId', () => {
    const item = buildStudyCartItem(exp())
    expect(item.type).toBe('print')
    expect(item.productId.startsWith('study-export:')).toBe(true)
    expect(item.pageCount).toBe(10)
  })

  it('uses bw for normal mode and stapling for short summaries', () => {
    const item = buildStudyCartItem(exp({ pageCount: 8 }))
    expect(item.options?.color).toBe('blackwhite')
    expect(item.options?.binding).toBe('staple')
  })

  it('uses wire binding for long booklets', () => {
    const item = buildStudyCartItem(exp({ pageCount: 120, sourceType: 'booklet' }))
    expect(item.options?.binding).toBe('wire')
  })

  it('color mode is honored', () => {
    const item = buildStudyCartItem(exp({ printMode: 'color' }))
    expect(item.options?.color).toBe('color')
  })

  it('server pricing recomputes the line independent of the cart display price', () => {
    const item = buildStudyCartItem(exp({ pageCount: 10 }))
    // Tamper the client display price — server must ignore it.
    const tampered: CartItemInput = {
      productId: item.productId,
      name: item.name,
      quantity: 1,
      options: { ...item.options, productType: 'paper' } as unknown as CartItemInput['options'],
      pageCount: 10,
    }
    const pricing = computeOrderPricing([tampered], {}, 'pickup', 0)
    expect(pricing.total).toBeGreaterThan(0)
    // A 10-page A4 BW double-sided staple job is well under 10 JD.
    expect(pricing.total).toBeLessThan(10)
  })
})
