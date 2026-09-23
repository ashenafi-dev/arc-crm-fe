import { supabase } from '@/lib/supabase'
import type { LaborRequest } from '@/types'

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
