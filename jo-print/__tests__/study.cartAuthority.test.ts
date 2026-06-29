import { describe, it, expect } from 'vitest'
import { buildStudyCartItem, type StudyExportForCart } from '@/lib/study/cartExport'
import { computeOrderPricing, type CartItemInput } from '@/lib/serverPricing'

const exp = (over: Partial<StudyExportForCart> = {}): StudyExportForCart => ({
  id: 'e1', sourceType: 'summary', title: 'ملخص', pageCount: 10, printMode: 'bw', ...over,
})

describe('buildStudyCartItem — cart authority', () => {
  it('returns a print item with a non-UUID productId', () => {
    const item = buildStudyCartItem(exp())
    expect(item.type).toBe('print')
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(uuidRe.test(item.productId)).toBe(false)
  })

  it('server total is independent of any tampered client price', () => {
    const item = buildStudyCartItem(exp({ pageCount: 10 }))
    const options = { ...item.options, productType: 'paper' } as unknown as CartItemInput['options']

    const withTinyPrice: CartItemInput = {
      productId: item.productId, name: item.name, quantity: 1, options, pageCount: 10,
      // @ts-expect-error — price is not part of CartItemInput; prove it is ignored.
      price: 0.001,
    }
    const withHugePrice: CartItemInput = {
      productId: item.productId, name: item.name, quantity: 1, options, pageCount: 10,
      // @ts-expect-error — price is not part of CartItemInput; prove it is ignored.
      price: 9999,
    }

    const a = computeOrderPricing([withTinyPrice], {}, 'pickup', 0)
    const b = computeOrderPricing([withHugePrice], {}, 'pickup', 0)

    expect(a.total).toBe(b.total)
    expect(a.total).toBeGreaterThan(0)
    expect(a.total).toBeLessThan(10)
  })
})
