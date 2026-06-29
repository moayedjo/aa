import { describe, it, expect } from 'vitest'
import { STUDY_RATE_RULES, DEFAULT_RULE } from '@/lib/study/rateLimitConfig'

describe('STUDY_RATE_RULES', () => {
  it('every rule has a positive limit and window', () => {
    for (const [feature, rule] of Object.entries(STUDY_RATE_RULES)) {
      expect(rule.limit, feature).toBeGreaterThan(0)
      expect(rule.windowMs, feature).toBeGreaterThan(0)
    }
  })

  it('AI features are stricter (lower limit) than files_read', () => {
    const reads = STUDY_RATE_RULES.files_read.limit
    for (const f of ['summary', 'quiz', 'flashcards'] as const) {
      expect(STUDY_RATE_RULES[f].limit).toBeLessThan(reads)
    }
  })

  it('DEFAULT_RULE exists with positive limit/window', () => {
    expect(DEFAULT_RULE.limit).toBeGreaterThan(0)
    expect(DEFAULT_RULE.windowMs).toBeGreaterThan(0)
  })
})
