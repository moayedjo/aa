import { describe, it, expect } from 'vitest'
import {
  parseJsonObject, getAiProvider,
  AiInvalidOutputError, AiNotConfiguredError,
} from '@/lib/study/aiProvider'
import { isAiConfigured } from '@/lib/study/config'
import { summarySchema } from '@/lib/study/schemas'

describe('parseJsonObject — tolerant parsing of AI output', () => {
  it('parses a plain JSON object', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses a fenced ```json block', () => {
    expect(parseJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })

  it('parses JSON embedded in surrounding prose', () => {
    expect(parseJsonObject('Here is the result: {"a":3} thanks')).toEqual({ a: 3 })
  })

  it('throws AiInvalidOutputError on non-JSON', () => {
    expect(() => parseJsonObject('not json at all')).toThrow(AiInvalidOutputError)
  })

  it('throws AiInvalidOutputError on malformed JSON object', () => {
    expect(() => parseJsonObject('{ broken: }')).toThrow(AiInvalidOutputError)
  })
})

describe('summarySchema — catches unvalidated AI JSON', () => {
  it('rejects output missing required fields', () => {
    expect(() => summarySchema.parse({ summaryType: 'standard' })).toThrow()
  })

  it('accepts valid output and applies array defaults', () => {
    const parsed = summarySchema.parse({
      title: 'عنوان',
      summaryType: 'standard',
      overview: 'نص',
    })
    expect(parsed.mainIdeas).toEqual([])
    expect(parsed.keyFacts).toEqual([])
  })
})

describe('AI configuration gating (no key in env)', () => {
  it('isAiConfigured is false and getAiProvider throws when key is unset', () => {
    const prev = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    try {
      expect(isAiConfigured()).toBe(false)
      expect(() => getAiProvider()).toThrow(AiNotConfiguredError)
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev
    }
  })
})
