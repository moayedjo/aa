/**
 * JO Study — centralized rate-limit configuration.
 * One place for all limits; no scattered magic numbers in routes.
 */
import { rateLimit } from '@/lib/rateLimit'

export interface RateRule { limit: number; windowMs: number }

const MIN = 60_000

// Per-feature, per-user rate rules. AI generation is stricter than reads.
export const STUDY_RATE_RULES: Record<string, RateRule> = {
  upload:    { limit: 20, windowMs: MIN },
  files_read:{ limit: 120, windowMs: MIN },
  delete:    { limit: 30, windowMs: MIN },
  process:   { limit: 15, windowMs: MIN },
  summary:   { limit: 8,  windowMs: MIN },
  chat:      { limit: 20, windowMs: MIN },
  quiz:      { limit: 8,  windowMs: MIN },
  flashcards:{ limit: 8,  windowMs: MIN },
  export:    { limit: 12, windowMs: MIN },
  cart:      { limit: 30, windowMs: MIN },
}

export const DEFAULT_RULE: RateRule = { limit: 30, windowMs: MIN }

/**
 * Enforce a per-user rate limit for a study feature.
 * Returns true if allowed, false if the limit is exceeded.
 */
export async function studyRateLimit(feature: string, userId: string): Promise<boolean> {
  const rule = STUDY_RATE_RULES[feature] ?? DEFAULT_RULE
  return rateLimit(`study:${feature}:${userId}`, rule.limit, rule.windowMs)
}
