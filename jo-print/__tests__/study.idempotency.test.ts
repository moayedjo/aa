import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { withIdempotency } from '@/lib/study/idempotency'

describe('withIdempotency — dev fallback (no service role)', () => {
  let prev: string | undefined
  beforeEach(() => {
    prev = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })
  afterEach(() => {
    if (prev !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prev
  })

  it('runs fn exactly once with no key, replayed=false', async () => {
    let calls = 0
    const out = await withIdempotency(
      { userId: 'u1', key: null, feature: 'summary' },
      async () => { calls++; return { id: 'r1' } },
    )
    expect(calls).toBe(1)
    expect(out.replayed).toBe(false)
    expect(out.result).toEqual({ id: 'r1' })
  })

  it('with a key but no service role configured still runs fn (dev fallback)', async () => {
    let calls = 0
    const out = await withIdempotency(
      { userId: 'u1', key: 'abc-123', feature: 'quiz' },
      async () => { calls++; return { id: 'r2' } },
    )
    expect(calls).toBe(1)
    expect(out.replayed).toBe(false)
    expect(out.result).toEqual({ id: 'r2' })
  })
})
