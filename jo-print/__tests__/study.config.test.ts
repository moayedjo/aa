import { describe, it, expect } from 'vitest'
import { getPlanLimits, STUDY_PLANS, STUDY_ALLOWED_MIME } from '@/lib/study/config'

describe('study config', () => {
  it('falls back to free plan for unknown plan id', () => {
    expect(getPlanLimits('nonexistent').id).toBe('free')
    expect(getPlanLimits(null).id).toBe('free')
    expect(getPlanLimits(undefined).id).toBe('free')
  })

  it('resolves named plans', () => {
    expect(getPlanLimits('student').id).toBe('student')
    expect(getPlanLimits('print_bundle').id).toBe('print_bundle')
  })

  it('free plan is more restricted than student plan', () => {
    expect(STUDY_PLANS.free.maxFiles).toBeLessThan(STUDY_PLANS.student.maxFiles)
    expect(STUDY_PLANS.free.dailyAiRequests).toBeLessThan(STUDY_PLANS.student.dailyAiRequests)
    expect(STUDY_PLANS.free.allowDetailedSummary).toBe(false)
    expect(STUDY_PLANS.student.allowDetailedSummary).toBe(true)
  })

  it('only allows the four documented upload types', () => {
    expect(Object.values(STUDY_ALLOWED_MIME).sort()).toEqual(['docx', 'pdf', 'pptx', 'txt'])
  })
})
