import { createClient } from '@/lib/supabase/server'

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - windowMs).toISOString()
    
    const { count } = await supabase
      .from('rate_limit_events')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gt('created_at', cutoff)
    
    if ((count ?? 0) >= limit) return false
    
    await supabase.from('rate_limit_events').insert({ key })
    return true
  } catch {
    return false // fail closed — DB error = deny request
  }
}
