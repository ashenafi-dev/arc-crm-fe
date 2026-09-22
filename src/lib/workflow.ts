import { supabase } from './supabase'
import type { ApprovalStage, RequestStatus } from '@/types'

const NEXT_STAGE: Record<ApprovalStage, RequestStatus> = {
  finance: 'awaiting_gm',
  gm: 'awaiting_owner',
  owner: 'approved',
}

const STAGE_AWAITING: Record<ApprovalStage, RequestStatus> = {
  finance: 'awaiting_finance',
  gm: 'awaiting_gm',
  owner: 'awaiting_owner',
}

async function logAudit(actorId: string, action: string, entityId: string, description: string) {
  await supabase.from('audit_events').insert({
    actor_id: actorId,
    action,
    entity_type: 'purchase_request',
    entity_id: entityId,
    description,
  })
}

export async function approveStage(requestId: string, stage: ApprovalStage, actorId: string, comments?: string) {
  const nextStatus = NEXT_STAGE[stage]

  const { error: approvalError } = await supabase
    .from('approvals')
    .update({ decision: 'approved', reviewer_id: actorId, comments, decided_at: new Date().toISOString() })
    .eq('purchase_request_id', requestId)
    .eq('stage', stage)

  if (approvalError) return { error: approvalError.message }

  if (nextStatus !== 'approved') {
    await supabase.from('approvals').insert({
      purchase_request_id: requestId,
      stage: stage === 'finance' ? 'gm' : 'owner',
      decision: 'pending',
    })
  }

  const { error: statusError } = await supabase
    .from('purchase_requests')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (statusError) return { error: statusError.message }

  await logAudit(actorId, `${stage}_approved`, requestId, `${stage.toUpperCase()} approved the request.`)
  return { error: null }
}

export async function rejectRequest(requestId: string, stage: ApprovalStage, actorId: string, reason: string) {
  await supabase
    .from('approvals')
    .update({ decision: 'rejected', reviewer_id: actorId, comments: reason, decided_at: new Date().toISOString() })
    .eq('purchase_request_id', requestId)
    .eq('stage', stage)

  const { error } = await supabase
    .from('purchase_requests')
    .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }

  await logAudit(actorId, 'rejected', requestId, `Request rejected at ${stage} stage: ${reason}`)
  return { error: null }
}

export async function recordPurchase(requestId: string, actorId: string, actualAmount: number) {
  const { error } = await supabase
    .from('purchase_requests')
    .update({ status: 'purchased', actual_amount: actualAmount, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }
  await logAudit(actorId, 'purchased', requestId, `Purchase recorded at ${actualAmount.toLocaleString()}.`)
  return { error: null }
}

export async function completeRequest(requestId: string, actorId: string) {
  const { error } = await supabase
    .from('purchase_requests')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }
  await logAudit(actorId, 'completed', requestId, 'Request marked as completed.')
  return { error: null }
}

export function stageForStatus(status: RequestStatus): ApprovalStage | null {
  if (status === 'awaiting_finance') return 'finance'
  if (status === 'awaiting_gm') return 'gm'
  if (status === 'awaiting_owner') return 'owner'
  return null
}

export { STAGE_AWAITING }
