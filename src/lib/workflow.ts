import { supabase } from './supabase'
import type { ApprovalStage, RequestStatus, Role } from '@/types'

// Every status change runs through a Postgres function (supabase/migrations/002_pilot_features.sql)
// that checks the role, blocks self-approval, updates approvals, writes the audit event and
// triggers notifications in one transaction. The UI only decides which buttons to show.

const STAGE_AWAITING: Record<ApprovalStage, RequestStatus> = {
  finance: 'awaiting_finance',
  gm: 'awaiting_gm',
  owner: 'awaiting_owner',
}

export const ROLE_STAGE: Record<Role, ApprovalStage | null> = {
  finance: 'finance',
  general_manager: 'gm',
  owner: 'owner',
  employee: null,
  admin: null,
}

export const STAGE_LABELS: Record<ApprovalStage, string> = { finance: 'Finance', gm: 'General Manager', owner: 'Owner' }

/** Statuses a requester can still edit and submit */
export const EDITABLE_STATUSES: RequestStatus[] = ['draft', 'quote_received']

type Result = { error: string | null }

async function call(fn: string, args: Record<string, unknown>): Promise<Result> {
  const { error } = await supabase.rpc(fn, args)
  return { error: error?.message ?? null }
}

/** Draft / Quote Received -> Awaiting Finance. Needs at least one quotation. */
export function submitRequest(requestId: string) {
  return call('submit_purchase_request', { p_request_id: requestId })
}

export function approveStage(requestId: string, comments?: string, approvedAmount?: number | null) {
  return call('decide_purchase_request', {
    p_request_id: requestId,
    p_decision: 'approve',
    p_comment: comments || null,
    p_approved_amount: approvedAmount ?? null,
  })
}

export function rejectRequest(requestId: string, reason: string) {
  return call('decide_purchase_request', { p_request_id: requestId, p_decision: 'reject', p_comment: reason })
}

/** Sends the request back to the requester for changes; the approval chain restarts on resubmit */
export function returnToRequester(requestId: string, note: string) {
  return call('decide_purchase_request', { p_request_id: requestId, p_decision: 'return', p_comment: note })
}

export function recordPurchase(requestId: string, actualAmount: number) {
  return call('record_purchase', { p_request_id: requestId, p_actual_amount: actualAmount })
}

export function completeRequest(requestId: string) {
  return call('complete_purchase_request', { p_request_id: requestId })
}

export function stageForStatus(status: RequestStatus): ApprovalStage | null {
  if (status === 'awaiting_finance') return 'finance'
  if (status === 'awaiting_gm') return 'gm'
  if (status === 'awaiting_owner') return 'owner'
  return null
}

/** Client-side audit entry for actions without a workflow function (e.g. creating a draft) */
export async function logAudit(actorId: string, action: string, entityType: string, entityId: string, description: string) {
  await supabase.from('audit_events').insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, description })
}

export { STAGE_AWAITING }
