import { createClient as createServiceClient } from '@supabase/supabase-js'

export interface AuditEntry {
  event_type: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string | null
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — audit log skipped')
    return
  }

  // Hash IP address before storing — avoid storing raw IPs in audit log
  let ipHash: string | null = null
  if (entry.ip_address && entry.ip_address !== 'unknown') {
    const encoder = new TextEncoder()
    const data = encoder.encode(entry.ip_address)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.from('audit_log').insert({
    event_type:    entry.event_type,
    actor_user_id: entry.actor_user_id,
    action:        entry.action,
    entity_type:   entry.entity_type,
    entity_id:     entry.entity_id ?? null,
    old_values:    entry.old_values ?? null,
    new_values:    entry.new_values ?? null,
    ip_hash:       ipHash,
  })

  if (error) {
    // Non-fatal: log to server console but never throw — audit failure must not break the request
    console.error('audit_log insert error:', error)
  }
}
