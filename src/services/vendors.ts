import { supabase } from '@/lib/supabase'
import type { PurchaseAttachment, PurchaseRequest, Role, Vendor, VendorQuotation } from '@/types'

/** Mirrors the vendors_write RLS policy */
export const VENDOR_MANAGER_ROLES: Role[] = ['admin', 'owner', 'finance']

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendors').select('*').order('name')
  if (error) {
    console.error('Error fetching vendors:', error)
    return []
  }
  return (data as Vendor[]) ?? []
}

export async function fetchVendor(id: string): Promise<Vendor | null> {
  const { data, error } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error(`Error fetching vendor ${id}:`, error)
    return null
  }
  return data as Vendor | null
}

export type VendorInput = Pick<Vendor, 'name' | 'contact_person' | 'phone' | 'email' | 'services' | 'address'> & { is_active: boolean }

/** Creates a vendor, or updates it when an id is given */
export async function saveVendor(input: VendorInput, id?: string): Promise<{ data: Vendor | null; error: string | null }> {
  const query = id ? supabase.from('vendors').update(input).eq('id', id) : supabase.from('vendors').insert(input)
  const { data, error } = await query.select().single()
  return { data: (data as Vendor) ?? null, error: error?.message ?? null }
}

export type VendorRequestSummary = Pick<
  PurchaseRequest,
  'id' | 'request_number' | 'title' | 'status' | 'created_at' | 'estimated_amount' | 'approved_amount' | 'actual_amount'
> & { project?: { name: string } | null }

export interface VendorQuoteRow extends Omit<VendorQuotation, 'vendor'> {
  request: VendorRequestSummary | null
  /** Every quote amount on the same request, this one included */
  competing: number[]
}

export interface VendorHistory {
  quotes: VendorQuoteRow[]
  documents: (PurchaseAttachment & { request?: Pick<PurchaseRequest, 'id' | 'request_number' | 'title'> | null })[]
}

/** Quotation history for a vendor, with the rival quotes on each request and the quotation files of requests it won */
export async function fetchVendorHistory(vendorId: string): Promise<VendorHistory> {
  const { data, error } = await supabase
    .from('vendor_quotations')
    .select(
      '*, request:purchase_requests(id, request_number, title, status, created_at, estimated_amount, approved_amount, actual_amount, project:projects(name))',
    )
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching quotations for vendor ${vendorId}:`, error)
    return { quotes: [], documents: [] }
  }

  // Requests hidden by row level security come back as null; drop those quotes
  const rows = ((data ?? []) as Omit<VendorQuoteRow, 'competing'>[]).filter((q) => q.request)
  const requestIds = [...new Set(rows.map((q) => q.purchase_request_id))]
  const wonIds = [...new Set(rows.filter((q) => q.is_selected).map((q) => q.purchase_request_id))]

  const [all, docs] = await Promise.all([
    requestIds.length
      ? supabase.from('vendor_quotations').select('purchase_request_id, amount').in('purchase_request_id', requestIds)
      : Promise.resolve({ data: [], error: null }),
    wonIds.length
      ? supabase
          .from('purchase_attachments')
          .select('*, request:purchase_requests(id, request_number, title)')
          .in('purchase_request_id', wonIds)
          .eq('attachment_type', 'quotation')
          .order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  const amountsByRequest = new Map<string, number[]>()
  for (const q of (all.data ?? []) as { purchase_request_id: string; amount: number }[]) {
    const list = amountsByRequest.get(q.purchase_request_id) ?? []
    list.push(Number(q.amount))
    amountsByRequest.set(q.purchase_request_id, list)
  }

  return {
    quotes: rows.map((q) => ({ ...q, competing: amountsByRequest.get(q.purchase_request_id) ?? [Number(q.amount)] })),
    documents: (docs.data ?? []) as VendorHistory['documents'],
  }
}
