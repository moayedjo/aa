/**
 * JO Study — usage tracking and limit enforcement.
 * Writes to ai_usage use the service-role client (server-only).
 */
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { getPlanLimits, type StudyPlanLimits } from './config'
import { estimateCost, type AiUsage } from './aiProvider'

export class UsageLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageLimitError'
  }
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Resolve a user's plan limits. Plans are not yet a billing system; we read an
 * optional profiles.study_plan column and fall back to the free plan.
 */
export async function getUserPlanLimits(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudyPlanLimits> {
  try {
    const { data } = await supabase.from('profiles').select('study_plan').eq('id', userId).single()
    const planRow = data as { study_plan?: string | null } | null
    return getPlanLimits(planRow?.study_plan ?? null)
  } catch {
    return getPlanLimits(null)
  }
}

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
}

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

/**
 * Enforce daily request and monthly token limits before an AI call.
 * Throws UsageLimitError when a limit is exceeded.
 */
export async function enforceUsageLimits(
  userId: string,
  limits: StudyPlanLimits,
  opts: { feature?: string; maxSummariesPerDay?: boolean } = {},
): Promise<void> {
  const admin = serviceClient()
  if (!admin) return // no service role configured — cannot enforce; fail open in dev only

  // Daily request count
  const { count: dailyCount } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfTodayIso())

  if ((dailyCount ?? 0) >= limits.dailyAiRequests) {
    throw new UsageLimitError('تجاوزت الحد اليومي لطلبات الذكاء الاصطناعي')
  }

  // Per-feature daily caps (summaries)
  if (opts.maxSummariesPerDay && opts.feature) {
    const { count: featureCount } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', opts.feature)
      .gte('created_at', startOfTodayIso())
    if ((featureCount ?? 0) >= limits.maxSummariesPerDay) {
      throw new UsageLimitError('تجاوزت الحد اليومي لإنشاء الملخصات')
    }
  }

  // Monthly token budget
  const { data: monthRows } = await admin
    .from('ai_usage')
    .select('input_tokens, output_tokens')
    .eq('user_id', userId)
    .gte('created_at', startOfMonthIso())

  const monthlyTokens = (monthRows ?? []).reduce(
    (sum: number, r: { input_tokens: number; output_tokens: number }) =>
      sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    0,
  )
  if (monthlyTokens >= limits.monthlyTokenBudget) {
    throw new UsageLimitError('تجاوزت حد الاستهلاك الشهري')
  }
}

export type RequestStatus = 'success' | 'error' | 'rate_limited' | 'invalid_output'

/** Record an AI usage event. Never throws — failure to log must not break the request. */
export async function recordUsage(params: {
  userId: string | null
  feature: string
  model: string | null
  usage?: AiUsage
  status: RequestStatus
}): Promise<void> {
  const admin = serviceClient()
  if (!admin) return
  const usage = params.usage ?? { inputTokens: 0, outputTokens: 0 }
  try {
    await admin.from('ai_usage').insert({
      user_id: params.userId,
      feature: params.feature,
      model: params.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      estimated_cost: estimateCost(usage),
      request_status: params.status,
    })
  } catch (err) {
    console.error('recordUsage failed:', err)
  }
}
