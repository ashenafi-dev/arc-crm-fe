import { supabase } from '@/lib/supabase'
import type { AuditEvent, LaborRequest, LaborStatus } from '@/types'

/** The forward path a labor request moves through; cancelled sits outside it */
export const LABOR_FLOW: LaborStatus[] = ['requested', 'reviewed', 'assigned', 'in_progress', 'completed']

export const NEXT_LABOR_STATUS: Partial<Record<LaborStatus, LaborStatus>> = {
  requested: 'reviewed',
  reviewed: 'assigned',
  assigned: 'in_progress',
  in_progress: 'completed',
}

/** Quick picks for the expected duration, in working hours (1 day = 8h, 1 week = 40h) */
export const DURATION_PRESETS = [
  { label: '4h', hours: 4 },
  { label: '8h', hours: 8 },
  { label: '2 days', hours: 16 },
  { label: '1 week', hours: 40 },
]

export function formatDuration(hours: number | null | undefined) {
  if (hours == null || !Number(hours)) return null
  const h = Number(hours)
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  if (h >= 40 && h % 40 === 0) return plural(h / 40, 'week')
  if (h >= 8 && h % 8 === 0) return plural(h / 8, 'day')
  return `${h}h`
}

export function isLaborManager(role: string | undefined) {
  return role === 'admin' || role === 'general_manager' || role === 'owner'
}

export async function fetchLaborRequests(): Promise<LaborRequest[]> {
  const { data, error } = await supabase
    .from('labor_requests')
    .select('*, project:projects(*), requester:profiles(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching labor requests:', error)
    return []
  }
  return (data as LaborRequest[]) ?? []
}

export async function fetchLaborRequest(id: string): Promise<LaborRequest | null> {
  const { data, error } = await supabase
    .from('labor_requests')
    .select('*, project:projects(*), requester:profiles!labor_requests_requested_by_fkey(*)')
    .eq('id', id)
    .maybeSingle()
  if (!error) return (data as LaborRequest) ?? null

  // FK named differently on this database: load the request and its requester separately
  const { data: plain } = await supabase.from('labor_requests').select('*, project:projects(*)').eq('id', id).maybeSingle()
  if (!plain) return null
  const labor = plain as LaborRequest
  const { data: requester } = await supabase.from('profiles').select('*').eq('id', labor.requested_by).maybeSingle()
  return { ...labor, requester: requester ?? undefined }
}

export async function fetchLaborHistory(id: string): Promise<AuditEvent[]> {
  const query = (select: string) =>
    supabase.from('audit_events').select(select).eq('entity_type', 'labor_request').eq('entity_id', id).order('created_at', { ascending: true })
  let { data, error } = await query('*, actor:profiles(*)')
  if (error) ({ data, error } = await query('*'))
  return (data as unknown as AuditEvent[]) ?? []
}

export async function updateLaborRequest(id: string, patch: Partial<Pick<LaborRequest, 'status' | 'assigned_to' | 'management_notes'>>) {
  const { error } = await supabase.from('labor_requests').update(patch).eq('id', id)
  return { error: error?.message ?? null }
}
