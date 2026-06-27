/**
 * JO Study — service-role Supabase client for storage operations only.
 *
 * Use ONLY for storage (signed URLs / download / upload) where the SSR auth
 * client cannot reach private buckets. ALWAYS verify ownership in route code
 * BEFORE touching any object via this client. DB writes should prefer the SSR
 * `createClient()` (auth context) so RLS still applies.
 */
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

export class ServiceRoleUnavailableError extends Error {
  constructor() {
    super('Service role client is not configured')
    this.name = 'ServiceRoleUnavailableError'
  }
}

/** Returns a service-role client, or throws if env is missing. */
export function studyServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new ServiceRoleUnavailableError()
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
