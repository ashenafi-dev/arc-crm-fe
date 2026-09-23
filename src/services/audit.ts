import { supabase } from '@/lib/supabase'
import type { AuditEvent } from '@/types'

export async function fetchAuditLogs(limit = 100): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from('audit_events')
    .select('*, actor:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
  return (data as AuditEvent[]) ?? []
}
