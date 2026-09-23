import { supabase } from '@/lib/supabase'
import type { PurchaseRequest, Project } from '@/types'

export async function fetchPurchaseRequests(): Promise<PurchaseRequest[]> {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, project:projects(*), requester:profiles(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching purchase requests:', error)
    return []
  }
  return (data as PurchaseRequest[]) ?? []
}

export async function fetchPurchaseRequestById(id: string): Promise<PurchaseRequest | null> {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select(`
      *,
      project:projects(*),
      requester:profiles(*),
      items:purchase_items(*),
      quotations:vendor_quotations(*, vendor:vendors(*)),
      approvals:approvals(*, reviewer:profiles(*)),
      attachments:purchase_attachments(*, uploaded_by_profile:profiles(*))
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Error fetching request ${id}:`, error)
    return null
  }
  return data as PurchaseRequest
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*').eq('is_active', true).order('name')
  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }
  return (data as Project[]) ?? []
}
