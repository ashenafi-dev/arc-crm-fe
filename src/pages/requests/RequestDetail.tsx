import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { approveStage, rejectRequest, recordPurchase, completeRequest, stageForStatus } from '@/lib/workflow'
import { attachFile } from '@/lib/storage'
import { ATTACHMENT_TYPE_LABELS, type PurchaseRequest, type ApprovalStage, type AttachmentType } from '@/types'

const ROLE_STAGE: Record<string, ApprovalStage | null> = {
  finance: 'finance',
  general_manager: 'gm',
  owner: 'owner',
  employee: null,
  admin: null,
}

export function RequestDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [request, setRequest] = useState<PurchaseRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<AttachmentType>('other')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('purchase_requests')
      .select(
        '*, project:projects(*), requester:profiles(*), quotations:vendor_quotations(*, vendor:vendors(*)), approvals(*, reviewer:profiles(*)), attachments:purchase_attachments(*, uploaded_by_profile:profiles(*))',
      )
      .eq('id', id)
      .single()
    setRequest(data as PurchaseRequest)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <p className="py-10 text-center text-slate-500">Loading…</p>
  if (!request) return <p className="py-10 text-center text-slate-500">Request not found.</p>

  const myStage = profile ? ROLE_STAGE[profile.role] : null
  const currentStage = stageForStatus(request.status)
  const canAct = myStage && currentStage === myStage

  async function handleApprove() {
    if (!profile || !currentStage) return
    setBusy(true)
    const { error } = await approveStage(request!.id, currentStage, profile.id)
    setBusy(false)
    if (error) toast.error(error)
    else {
      toast.success(`Approved — moved to next stage`)
      load()
    }
  }

  async function handleReject() {
    if (!profile || !currentStage) return
    if (!rejectReason.trim()) {
      toast.error('Add a rejection reason')
      return
    }
    setBusy(true)
    const { error } = await rejectRequest(request!.id, currentStage, profile.id, rejectReason)
    setBusy(false)
    if (error) toast.error(error)
    else {
      toast.success('Request rejected')
      setShowReject(false)
      load()
    }
  }

  async function handleRecordPurchase() {
    if (!profile) return
    const amount = Number(purchaseAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid purchase amount')
      return
    }
    setBusy(true)
    const { error } = await recordPurchase(request!.id, profile.id, amount)
    if (error) {
      setBusy(false)
      toast.error(error)
      return
    }
    if (receiptFile) {
      const { error: fileError } = await attachFile(request!.id, receiptFile, 'receipt', profile.id, 'Proof of purchase')
      if (fileError) toast.error(`Receipt upload failed: ${fileError}`)
    }
    setBusy(false)
    toast.success('Purchase recorded')
    setReceiptFile(null)
    load()
  }

  async function handleUploadDocument() {
    if (!profile || !uploadFile) {
      toast.error('Choose a file first')
      return
    }
    setUploadBusy(true)
    const { error } = await attachFile(request!.id, uploadFile, uploadType, profile.id)
    setUploadBusy(false)
    if (error) toast.error(error)
    else {
      toast.success('Document uploaded')
      setUploadFile(null)
      load()
    }
  }

  async function handleComplete() {
    if (!profile) return
    setBusy(true)
    const { error } = await completeRequest(request!.id, profile.id)
    setBusy(false)
    if (error) toast.error(error)
    else {
      toast.success('Request completed')
      load()
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/requests" className="text-sm text-slate-400 hover:text-slate-700">&larr; Back to requests</Link>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{request.request_number}</p>
            <h1 className="mt-1 text-xl font-bold text-[var(--ink)]">{request.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{request.project?.name} · {request.department}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{request.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-black/10 pt-5 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Estimated Amount</p>
            <p className="text-lg font-semibold text-[var(--ink)]">${Number(request.estimated_amount).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Requester</p>
            <p className="text-sm font-medium text-slate-700">{request.requester?.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Required Date</p>
            <p className="text-sm font-medium text-slate-700">{request.required_date ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Justification</p>
            <p className="text-sm font-medium text-slate-700">{request.justification || '—'}</p>
          </div>
        </div>

        {request.rejection_reason && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <strong>Rejected:</strong> {request.rejection_reason}
          </div>
        )}
      </GlassCard>

      {request.quotations && request.quotations.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Vendor Quotations</h3>
          <div className="space-y-2">
            {request.quotations.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-black/[0.025] px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{q.vendor?.name}</p>
                  <p className="text-xs text-slate-500">{q.notes}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">${Number(q.amount).toLocaleString()}</span>
                  {q.is_selected && <span className="rounded-full bg-[var(--emerald-500)]/15 px-2 py-0.5 text-xs font-medium text-[var(--emerald-500)]">Selected</span>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Documents</h3>
        <div className="space-y-2">
          {request.attachments && request.attachments.length > 0 ? (
            request.attachments.map((a) => (
              <a
                key={a.id}
                href={a.file_url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring flex items-center justify-between rounded-xl border border-black/5 bg-black/[0.025] px-3.5 py-3 transition-colors hover:bg-black/[0.045]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{a.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {ATTACHMENT_TYPE_LABELS[a.attachment_type]} · {a.uploaded_by_profile?.full_name ?? 'Unknown'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[var(--emerald-500)]">View →</span>
              </a>
            ))
          ) : (
            <p className="text-sm text-slate-500">No documents uploaded yet.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4">
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as AttachmentType)}
            className="focus-ring rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 text-xs text-slate-700"
          >
            {Object.entries(ATTACHMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="file"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="focus-ring flex-1 text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-black/[0.06] file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-[var(--ink)]"
          />
          <Button variant="outline" onClick={handleUploadDocument} loading={uploadBusy}>Upload</Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Approval Trail</h3>
        <div className="space-y-3">
          {['finance', 'gm', 'owner'].map((stage) => {
            const approval = request.approvals?.find((a) => a.stage === stage)
            return (
              <div key={stage} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: approval?.decision === 'approved' ? 'var(--status-green)33' : approval?.decision === 'rejected' ? 'var(--status-red)33' : 'rgba(255,255,255,0.06)',
                    color: approval?.decision === 'approved' ? 'var(--status-green)' : approval?.decision === 'rejected' ? 'var(--status-red)' : '#8b97a3',
                  }}
                >
                  {approval?.decision === 'approved' ? '✓' : approval?.decision === 'rejected' ? '✕' : '·'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize text-slate-700">{stage === 'gm' ? 'General Manager' : stage}</p>
                  <p className="text-xs text-slate-500">
                    {approval?.decision === 'pending' || !approval ? 'Pending' : `${approval.decision} ${approval.reviewer ? 'by ' + approval.reviewer.full_name : ''}`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {canAct && (
        <GlassCard strong className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Your Action Required</h3>
          {!showReject ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleApprove} loading={busy}>Approve</Button>
              <Button variant="danger" onClick={() => setShowReject(true)}>Reject</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-slate-500"
                rows={3}
              />
              <div className="flex gap-3">
                <Button variant="danger" onClick={handleReject} loading={busy}>Confirm Rejection</Button>
                <Button variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {request.status === 'approved' && (profile?.role === 'admin' || profile?.role === 'owner') && (
        <GlassCard strong className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Record Purchase</h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="Actual amount paid"
              type="number"
              className="focus-ring w-56 rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-slate-500"
            />
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              className="focus-ring flex-1 text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-black/[0.06] file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-[var(--ink)]"
            />
            <Button onClick={handleRecordPurchase} loading={busy}>Record Purchase</Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Attach a receipt or proof of purchase (optional).</p>
        </GlassCard>
      )}

      {request.status === 'purchased' && (profile?.role === 'admin' || profile?.role === 'owner') && (
        <GlassCard strong className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Complete Request</h3>
          <Button onClick={handleComplete} loading={busy}>Mark as Completed</Button>
        </GlassCard>
      )}
    </div>
  )
}
