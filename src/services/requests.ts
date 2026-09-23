import { supabase } from '@/lib/supabase'
import { attachFile } from '@/lib/storage'
import type { Department, PurchaseRequest, Project, Vendor } from '@/types'

// Fired after a purchase request is created or edited so open pages can reload
export const PURCHASE_SAVED_EVENT = 'purchase-request-saved'

export function announcePurchaseSaved(id: string) {
  window.dispatchEvent(new CustomEvent(PURCHASE_SAVED_EVENT, { detail: { id } }))
}

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

export async function fetchActiveVendors(): Promise<Vendor[]> {
  const { data } = await supabase.from('vendors').select('*').eq('is_active', true).order('name')
  return (data as Vendor[]) ?? []
}

/** Empty when the table is missing or unseeded; callers fall back to free text */
export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('*').eq('is_active', true).order('name')
  if (error) return []
  return (data as Department[]) ?? []
}

// ── Create / edit ────────────────────────────────────────────────────────────

export interface RequestInput {
  title: string
  description: string
  project_id: string
  department: string
  estimated_amount: number
  justification: string
  required_date: string | null
}

export interface ItemInput {
  name: string
  quantity: number
  unit: string
  estimated_unit_price: number | null
  description: string | null
}

export interface QuoteInput {
  vendor_id: string
  amount: number
  valid_until: string | null
  notes: string | null
  file: File | null
}

type Result = { error: string | null }

/** Always inserts a draft; request_number comes from the database default */
export async function createPurchaseRequest(input: RequestInput, requesterId: string): Promise<{ id: string | null; error: string | null }> {
  // The id is generated here so the insert needs no RETURNING (the row is only readable once committed)
  const id = crypto.randomUUID()
  const { error } = await supabase.from('purchase_requests').insert({ id, ...input, requester_id: requesterId, status: 'draft' })
  if (error) return { id: null, error: error.message }
  return { id, error: null }
}

/** Only the requester's own draft / quote_received rows pass RLS; status is never touched here */
export async function updatePurchaseRequest(id: string, input: RequestInput): Promise<Result> {
  const { error } = await supabase.from('purchase_requests').update(input).eq('id', id)
  return { error: error?.message ?? null }
}

export async function replaceItems(requestId: string, items: ItemInput[]): Promise<Result> {
  const { error: deleteError } = await supabase.from('purchase_items').delete().eq('purchase_request_id', requestId)
  if (deleteError) return { error: deleteError.message }
  if (items.length === 0) return { error: null }
  const { error } = await supabase.from('purchase_items').insert(items.map((item) => ({ ...item, purchase_request_id: requestId })))
  return { error: error?.message ?? null }
}

/** Adding a quote to a draft moves it to Quote Received (database trigger) */
export async function addQuotation(requestId: string, quote: QuoteInput, userId: string): Promise<Result & { fileError?: string | null }> {
  const { error } = await supabase.from('vendor_quotations').insert({
    purchase_request_id: requestId,
    vendor_id: quote.vendor_id,
    amount: quote.amount,
    valid_until: quote.valid_until,
    notes: quote.notes,
  })
  if (error) return { error: error.message }
  if (quote.file) {
    const { error: fileError } = await attachFile(requestId, quote.file, 'quotation', userId, 'Quotation from vendor')
    return { error: null, fileError }
  }
  return { error: null }
}

export async function deleteQuotations(ids: string[]): Promise<Result> {
  if (ids.length === 0) return { error: null }
  const { error } = await supabase.from('vendor_quotations').delete().in('id', ids)
  return { error: error?.message ?? null }
}

/** Only one quote per request is selected at a time */
export async function selectQuotation(requestId: string, quoteId: string): Promise<Result> {
  const { error: clearError } = await supabase
    .from('vendor_quotations')
    .update({ is_selected: false })
    .eq('purchase_request_id', requestId)
    .neq('id', quoteId)
  if (clearError) return { error: clearError.message }
  const { error } = await supabase.from('vendor_quotations').update({ is_selected: true }).eq('id', quoteId)
  return { error: error?.message ?? null }
}

/** Requesters can delete their own drafts; items, quotes and attachment rows cascade */
export async function deletePurchaseRequest(id: string): Promise<Result> {
  const { error, count } = await supabase.from('purchase_requests').delete({ count: 'exact' }).eq('id', id)
  if (error) return { error: error.message }
  if (count === 0) return { error: 'This request can no longer be deleted' }
  return { error: null }
}
