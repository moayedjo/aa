/**
 * JO Study — idempotency for expensive AI generation.
 * Guarantees a given (user, key, feature) runs at most once successfully.
 * Uses the service-role client (writes are service-role only under RLS).
 */
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

const STALE_PENDING_MS = 120_000 // a pending row older than this is considered abandoned

export class IdempotencyInProgressError extends Error {
  constructor() {
    super('A request with this idempotency key is already in progress')
    this.name = 'IdempotencyInProgressError'
  }
}

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface IdempotentOutcome<T> {
  result: T
  replayed: boolean
}

/**
 * Run `fn` at most once per (userId, key, feature).
 * - completed → returns stored result (replayed = true), fn NOT executed.
 * - pending & fresh → throws IdempotencyInProgressError (caller returns 429).
 * - pending & stale, or failed, or new → claims the slot and runs fn.
 *
 * If no key is provided, runs fn directly with no dedupe.
 *
 * `fn` must return a JSON-serializable result that includes enough to rebuild
 * the response (e.g. the created row id).
 */
export async function withIdempotency<T>(
  params: { userId: string; key: string | null | undefined; feature: string },
  fn: () => Promise<T>,
): Promise<IdempotentOutcome<T>> {
  const { userId, key, feature } = params
  if (!key) {
    return { result: await fn(), replayed: false }
  }

  const admin = serviceClient()
  if (!admin) {
    // No service role configured — cannot dedupe; run directly (dev only).
    return { result: await fn(), replayed: false }
  }

  // Look up existing record
  const { data: existing } = await admin
    .from('study_idempotency')
    .select('id, status, result, created_at')
    .eq('user_id', userId).eq('idem_key', key).eq('feature', feature)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'completed') {
      return { result: existing.result as T, replayed: true }
    }
    if (existing.status === 'pending') {
      const age = Date.now() - new Date(existing.created_at as string).getTime()
      if (age < STALE_PENDING_MS) throw new IdempotencyInProgressError()
      // stale: reclaim
      await admin.from('study_idempotency')
        .update({ status: 'pending', created_at: new Date().toISOString(), error: null })
        .eq('id', existing.id)
    } else {
      // failed: allow retry
      await admin.from('study_idempotency')
        .update({ status: 'pending', error: null })
        .eq('id', existing.id)
    }
  } else {
    // Try to claim. If a concurrent request inserted first, treat as in-progress.
    const { error: insErr } = await admin.from('study_idempotency')
      .insert({ user_id: userId, idem_key: key, feature, status: 'pending' })
    if (insErr) {
      // unique violation → another request is handling it
      throw new IdempotencyInProgressError()
    }
  }

  try {
    const result = await fn()
    await admin.from('study_idempotency')
      .update({ status: 'completed', result: result as unknown as Record<string, unknown> })
      .eq('user_id', userId).eq('idem_key', key).eq('feature', feature)
    return { result, replayed: false }
  } catch (err) {
    await admin.from('study_idempotency')
      .update({ status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : 'error' })
      .eq('user_id', userId).eq('idem_key', key).eq('feature', feature)
    throw err
  }
}
