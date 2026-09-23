import { useEffect, useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import clsx from 'clsx'
import { format } from 'date-fns'
import { ArrowLeft, Check, Clock, FileText, Paperclip, ShieldCheck, Upload, X as XIcon } from 'lucide-react'
import { notify } from '@/lib/notify'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Avatar, Button, StatusBadge } from '@/components/ui'
import { approveStage, rejectRequest, recordPurchase, completeRequest, stageForStatus } from '@/lib/workflow'
import { attachFile } from '@/lib/storage'
import { ATTACHMENT_TYPE_LABELS, ROLE_LABELS, type PurchaseRequest, type ApprovalStage, type AttachmentType } from '@/types'

const ROLE_STAGE: Record<string, ApprovalStage | null> = {
  finance: 'finance',
  general_manager: 'gm',
  owner: 'owner',
  employee: null,
  admin: null,
}

const STAGE_LABELS: Record<ApprovalStage, string> = { finance: 'Finance', gm: 'General Manager', owner: 'Owner' }

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
    const base = '*, project:projects(*), requester:profiles(*), quotations:vendor_quotations(*, vendor:vendors(*)), approvals(*, reviewer:profiles(*))'
    let { data, error } = await supabase
      .from('purchase_requests')
      .select(`${base}, attachments:purchase_attachments(*, uploaded_by_profile:profiles(*))`)
      .eq('id', id)
      .single()
    // Databases without supabase/add-attachments.sql applied have no attachments table yet
    if (error?.code === 'PGRST200') {
      ;({ data, error } = await supabase.from('purchase_requests').select(base).eq('id', id).single())
    }
    setRequest(data as PurchaseRequest)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <p className="py-16 text-center text-sm text-slate-500">Loading request…</p>
  if (!request)
    return (
      <div className="rounded-[1.75rem] bg-white px-6 py-16 text-center">
        <p className="text-2xl font-black text-[var(--ink)]">Request not found</p>
        <Link to="/requests" className="mt-3 inline-block text-sm font-medium text-[var(--accent)] underline underline-offset-4">
          Back to requests
        </Link>
      </div>
    )

  const myStage = profile ? ROLE_STAGE[profile.role] : null
  const currentStage = stageForStatus(request.status)
  const canAct = myStage && currentStage === myStage
  const canManage = profile?.role === 'admin' || profile?.role === 'owner'
  const quotes = request.quotations ?? []
  const lowest = quotes.length > 1 ? Math.min(...quotes.map((q) => Number(q.amount))) : null

  async function handleApprove() {
    if (!profile || !currentStage) return
    setBusy(true)
    const { error } = await approveStage(request!.id, currentStage, profile.id)
    setBusy(false)
    if (error) notify.error(`Could not approve this request: ${error}`)
    else {
      notify.success('Approved and moved to the next stage')
      load()
    }
  }

  async function handleReject() {
    if (!profile || !currentStage) return
    if (!rejectReason.trim()) {
      notify.warning('Add a reason before rejecting this request')
      return
    }
    setBusy(true)
    const { error } = await rejectRequest(request!.id, currentStage, profile.id, rejectReason)
    setBusy(false)
    if (error) notify.error(`Could not reject this request: ${error}`)
    else {
      notify.success('Request rejected and the reason was saved')
      setShowReject(false)
      load()
    }
  }

  async function handleRecordPurchase() {
    if (!profile) return
    const amount = Number(purchaseAmount)
    if (!amount || amount <= 0) {
      notify.warning('Enter the actual amount paid to continue')
      return
    }
    setBusy(true)
    const { error } = await recordPurchase(request!.id, profile.id, amount)
    if (error) {
      setBusy(false)
      notify.error(`Could not record the purchase: ${error}`)
      return
    }
    if (receiptFile) {
      const { error: fileError } = await attachFile(request!.id, receiptFile, 'receipt', profile.id, 'Proof of purchase')
      if (fileError) notify.warning(`Purchase saved, but the receipt upload failed: ${fileError}`)
    }
    setBusy(false)
    notify.success('Purchase recorded and request marked as purchased')
    setReceiptFile(null)
    load()
  }

  async function handleUploadDocument() {
    if (!profile || !uploadFile) {
      notify.warning('Choose a file before uploading a document')
      return
    }
    setUploadBusy(true)
    const { error } = await attachFile(request!.id, uploadFile, uploadType, profile.id)
    setUploadBusy(false)
    if (error) notify.error(`Could not upload the document: ${error}`)
    else {
      notify.success('Document uploaded and attached to this request')
      setUploadFile(null)
      load()
    }
  }

  async function handleComplete() {
    if (!profile) return
    setBusy(true)
    const { error } = await completeRequest(request!.id, profile.id)
    setBusy(false)
    if (error) notify.error(`Could not complete this request: ${error}`)
    else {
      notify.success('Request marked as completed, all done here')
      load()
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/requests" className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-white/70">
        <ArrowLeft size={16} />
        All requests
      </Link>

      {/* ── Hero ── */}
      <section className="rounded-[1.75rem] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-white">{request.request_number}</span>
          <StatusBadge status={request.status} />
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-black tracking-[-0.035em] text-[var(--ink)]">{request.title}</h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {request.project?.name} · {request.department}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{request.actual_amount != null ? 'Paid' : 'Estimated'}</p>
            <p className="text-[clamp(2.2rem,5vw,3.5rem)] leading-none font-black tracking-tight text-[var(--ink)]">
              ${Number(request.actual_amount ?? request.estimated_amount).toLocaleString()}
            </p>
            {request.actual_amount != null && (
              <p className="mt-1 text-xs text-slate-500">Estimated ${Number(request.estimated_amount).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/[0.06] pt-6 md:grid-cols-4">
          <Meta label="Requester">
            <span className="flex items-center gap-2">
              {request.requester && <Avatar initials={request.requester.avatar_initials} size={26} />}
              <span className="truncate">{request.requester?.full_name}</span>
            </span>
          </Meta>
          <Meta label="Role">{request.requester ? ROLE_LABELS[request.requester.role] : '—'}</Meta>
          <Meta label="Needed by">{request.required_date ? format(new Date(`${request.required_date}T00:00`), 'MMM d, yyyy') : 'Not set'}</Meta>
          <Meta label="Submitted">{format(new Date(request.created_at), 'MMM d, yyyy')}</Meta>
        </div>

        {request.rejection_reason && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--accent-soft)] p-4 text-sm text-[var(--ink)]">
            <XIcon size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <p>
              <strong className="font-semibold">Rejected:</strong> {request.rejection_reason}
            </p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Main column ── */}
        <div className="order-2 space-y-4 lg:order-1">
          {(request.description || request.justification) && (
            <section className="grid grid-cols-1 gap-6 rounded-[1.75rem] bg-white p-6 sm:grid-cols-2 sm:p-8">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Description</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{request.description || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Justification</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{request.justification || '—'}</p>
              </div>
            </section>
          )}

          <section className="rounded-[1.75rem] bg-white p-6 sm:p-8">
            <SectionTitle title="Vendor quotations" count={quotes.length} />
            {quotes.length === 0 ? (
              <p className="text-sm text-slate-500">No quotations attached.</p>
            ) : (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--canvas)] px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                        {q.vendor?.name}
                        {Number(q.amount) === lowest && <span className="rounded-full bg-[var(--sun)] px-2 py-0.5 text-[11px]">Lowest</span>}
                        {q.is_selected && <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[11px] text-white">Selected</span>}
                      </p>
                      {q.notes && <p className="truncate text-xs text-slate-500">{q.notes}</p>}
                    </div>
                    <span className="shrink-0 text-lg font-bold text-[var(--ink)]">${Number(q.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[1.75rem] bg-white p-6 sm:p-8">
            <SectionTitle title="Documents" count={request.attachments?.length ?? 0} />
            <div className="space-y-2">
              {request.attachments && request.attachments.length > 0 ? (
                request.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring group flex items-center gap-3 rounded-2xl bg-[var(--canvas)] px-4 py-3 transition-colors hover:bg-[#ebe7e2]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--accent)]">
                      <FileText size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">{a.file_name}</p>
                      <p className="text-xs text-slate-500">
                        {ATTACHMENT_TYPE_LABELS[a.attachment_type]} · {a.uploaded_by_profile?.full_name ?? 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--ink)] opacity-0 transition-opacity group-hover:opacity-100">Open</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500">No documents uploaded yet.</p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-black/[0.06] pt-4 sm:flex-row">
              <select value={uploadType} onChange={(e) => setUploadType(e.target.value as AttachmentType)} className="field h-11 !py-0 sm:w-44">
                {Object.entries(ATTACHMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <FilePick file={uploadFile} onFile={setUploadFile} />
              <Button variant="outline" onClick={handleUploadDocument} loading={uploadBusy}>
                <Upload size={16} />
                Upload
              </Button>
            </div>
          </section>
        </div>

        {/* ── Side column: actions first so approvers see them immediately ── */}
        <div className="order-1 space-y-4 lg:order-2">
          {canAct && (
            <section className="panel-dark relative overflow-hidden rounded-[1.75rem] p-6">
              <div className="dot-noise absolute inset-0" />
              <div className="relative">
                <span className="rounded-full bg-[var(--sun)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">Your turn</span>
                <p className="mt-3 text-2xl leading-tight font-black text-white">Approve or reject this request</p>
                {!showReject ? (
                  <div className="mt-5 flex flex-col gap-2">
                    <Button variant="accent" onClick={handleApprove} loading={busy} className="h-12">
                      <Check size={18} strokeWidth={2.5} />
                      Approve
                    </Button>
                    <Button onClick={() => setShowReject(true)} className="h-12 border border-white/20 !bg-transparent hover:!bg-white/10">
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this rejected? The requester will see this."
                      className="field resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={handleReject} loading={busy} className="flex-1">
                        Confirm rejection
                      </Button>
                      <Button variant="ghost" onClick={() => setShowReject(false)} className="text-white hover:!bg-white/10">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {request.status === 'approved' && canManage && (
            <section className="rounded-[1.75rem] bg-white p-6">
              <SectionTitle title="Record purchase" />
              <div className="space-y-2">
                <input
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="Actual amount paid ($)"
                  type="number"
                  className="field"
                />
                <FilePick file={receiptFile} onFile={setReceiptFile} accept=".pdf,.png,.jpg,.jpeg" label="Attach receipt (optional)" />
                <Button onClick={handleRecordPurchase} loading={busy} className="w-full">
                  Record purchase
                </Button>
              </div>
            </section>
          )}

          {request.status === 'purchased' && canManage && (
            <section className="rounded-[1.75rem] bg-white p-6">
              <SectionTitle title="Close it out" />
              <p className="mb-4 text-sm text-[var(--ink-soft)]">Everything delivered? Mark the request complete.</p>
              <Button onClick={handleComplete} loading={busy} className="w-full">
                Mark as completed
              </Button>
            </section>
          )}

          <section className="rounded-[1.75rem] bg-white p-6">
            <SectionTitle title="Approval trail" />
            <ol className="space-y-5">
              {(['finance', 'gm', 'owner'] as const).map((stage, i) => {
                const approval = request.approvals?.find((a) => a.stage === stage)
                const decision = approval?.decision ?? 'pending'
                const current = currentStage === stage
                return (
                  <li key={stage} className="relative flex gap-3">
                    {i < 2 && <span className="absolute top-10 bottom-[-1.25rem] left-[1.1rem] w-px bg-black/10" />}
                    <span
                      className={clsx(
                        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        decision === 'approved' && 'bg-[#d3efdf] text-[#1e8c66]',
                        decision === 'rejected' && 'bg-[var(--accent-soft)] text-[var(--accent)]',
                        decision === 'pending' && (current ? 'bg-[var(--sun)] text-[var(--ink)]' : 'bg-[var(--canvas)] text-slate-400'),
                      )}
                    >
                      {decision === 'approved' ? (
                        <Check size={16} strokeWidth={3} />
                      ) : decision === 'rejected' ? (
                        <XIcon size={16} strokeWidth={3} />
                      ) : current ? (
                        <Clock size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-[var(--ink)]">{STAGE_LABELS[stage]}</p>
                      <p className="text-xs text-slate-500">
                        {decision === 'pending'
                          ? current
                            ? 'Waiting on review'
                            : 'Not reached yet'
                          : `${decision === 'approved' ? 'Approved' : 'Rejected'}${approval?.reviewer ? ` by ${approval.reviewer.full_name}` : ''}${
                              approval?.decided_at ? ` · ${format(new Date(approval.decided_at), 'MMM d')}` : ''
                            }`}
                      </p>
                      {approval?.comments && <p className="mt-1 text-xs text-[var(--ink-soft)] italic">“{approval.comments}”</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{children}</div>
    </div>
  )
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="text-xl font-bold text-[var(--ink)]">{title}</h2>
      {count !== undefined && (
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--canvas)] px-2 text-xs font-medium text-[var(--ink)]">{count}</span>
      )}
    </div>
  )
}

function FilePick({ file, onFile, accept, label = 'Choose a file' }: { file: File | null; onFile: (f: File | null) => void; accept?: string; label?: string }) {
  return (
    <label className="field flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 !py-0 hover:border-black/20">
      <Paperclip size={16} className="shrink-0 text-slate-400" />
      <span className={clsx('min-w-0 flex-1 truncate', !file && 'text-slate-400')}>{file ? file.name : label}</span>
      {file && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onFile(null)
          }}
          aria-label="Remove file"
          className="text-slate-400 hover:text-[var(--ink)]"
        >
          <XIcon size={14} />
        </button>
      )}
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </label>
  )
}
