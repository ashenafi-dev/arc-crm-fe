import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { format } from 'date-fns'
import { ArrowRight, Building2, CalendarDays, FileText, Plus, ReceiptText, Trash2, Upload, X } from 'lucide-react'
import { notify } from '@/lib/notify'
import { supabase } from '@/lib/supabase'
import { attachFile } from '@/lib/storage'
import { useAuth } from '@/context/AuthContext'
import { ReviewTile, StepField as Field, StepModal, type Step } from '@/components/ui/StepModal'
import type { Project, Vendor } from '@/types'

interface QuotationRow {
  vendor_id: string
  amount: string
  notes: string
  file: File | null
}

const EMPTY_QUOTATION: QuotationRow = { vendor_id: '', amount: '', notes: '', file: null }

const STEPS: Step[] = [
  { title: 'Details', hint: 'What you need and for which project' },
  { title: 'Cost & timing', hint: 'Estimate, due date and why' },
  { title: 'Quotations', hint: 'Vendor quotes, optional' },
  { title: 'Review', hint: 'Check and submit' },
]

const inputClass =
  'focus-ring w-full rounded-2xl border bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-slate-400 transition-colors focus:border-[var(--ink)] focus:bg-white'

function money(value: string | number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'
}

export function NewRequestModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [quotations, setQuotations] = useState<QuotationRow[]>([{ ...EMPTY_QUOTATION }])
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    department: profile?.department ?? '',
    estimated_amount: '',
    justification: '',
    required_date: '',
  })

  useEffect(() => {
    supabase.from('projects').select('*').eq('is_active', true).order('name').then(({ data }) => setProjects((data as Project[]) ?? []))
    supabase.from('vendors').select('*').eq('is_active', true).order('name').then(({ data }) => setVendors((data as Vendor[]) ?? []))
  }, [])

  const dirty =
    !!(form.title || form.description || form.project_id || form.estimated_amount || form.justification || form.required_date) ||
    quotations.some((q) => q.vendor_id || q.amount || q.notes || q.file)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateQuotation(index: number, patch: Partial<QuotationRow>) {
    setQuotations((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const stepErrors: Record<number, string | null> = {
    0: !form.title.trim() ? 'Add a short title for this request' : !form.project_id ? 'Choose which project this purchase is for' : null,
    1: !(Number(form.estimated_amount) > 0) ? 'Enter an estimated amount to continue' : null,
    2: null,
    3: null,
  }

  function next() {
    const error = stepErrors[step]
    if (error) {
      setShowErrors(true)
      notify.warning(error)
      return
    }
    setShowErrors(false)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goTo(target: number) {
    // Only allow jumping forward past steps that are already valid
    for (let s = 0; s < target; s++) {
      if (stepErrors[s]) {
        setStep(s)
        setShowErrors(true)
        return
      }
    }
    setShowErrors(false)
    setStep(target)
  }

  async function submit() {
    // Success navigates to the new request, which closes this modal
    if (!profile) return
    setBusy(true)

    const requestNumber = `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`
    const { data, error } = await supabase
      .from('purchase_requests')
      .insert({
        request_number: requestNumber,
        title: form.title.trim(),
        description: form.description,
        project_id: form.project_id,
        department: form.department || 'General',
        requester_id: profile.id,
        estimated_amount: Number(form.estimated_amount),
        justification: form.justification,
        required_date: form.required_date || null,
        status: 'awaiting_finance',
      })
      .select()
      .single()

    if (error || !data) {
      setBusy(false)
      notify.error(`Could not create request: ${error?.message ?? 'unknown error'}`)
      return
    }

    for (const q of quotations.filter((q) => q.vendor_id && q.amount)) {
      const { data: quoteRow, error: quoteError } = await supabase
        .from('vendor_quotations')
        .insert({ purchase_request_id: data.id, vendor_id: q.vendor_id, amount: Number(q.amount), notes: q.notes || null })
        .select()
        .single()

      if (quoteError) {
        notify.warning(`A vendor quotation was not saved: ${quoteError.message}`)
        continue
      }
      if (q.file && quoteRow) {
        const { error: fileError } = await attachFile(data.id, q.file, 'quotation', profile.id, 'Quotation from vendor')
        if (fileError) notify.warning(`Quote file could not be uploaded: ${fileError}`)
      }
    }

    await supabase.from('approvals').insert({ purchase_request_id: data.id, stage: 'finance', decision: 'pending' })
    await supabase.from('audit_events').insert({
      actor_id: profile.id,
      action: 'purchase_submitted',
      entity_type: 'purchase_request',
      entity_id: data.id,
      description: `${profile.full_name} submitted "${form.title.trim()}" for Finance review.`,
    })

    setBusy(false)
    notify.success('Request submitted for Finance review')
    navigate(`/requests/${data.id}`)
  }

  const project = projects.find((p) => p.id === form.project_id)
  const validQuotes = quotations.filter((q) => q.vendor_id && Number(q.amount) > 0)
  const lowestQuote = validQuotes.length ? Math.min(...validQuotes.map((q) => Number(q.amount))) : null
  const err = (s: number, when: boolean) => showErrors && step === s && when

  return (
    <StepModal
      title="New purchase request"
      icon={ReceiptText}
      steps={STEPS}
      step={step}
      onNext={next}
      onBack={() => setStep((s) => s - 1)}
      onGoTo={goTo}
      onSubmit={submit}
      submitLabel="Submit for Finance review"
      busy={busy}
      dirty={dirty}
      onClose={onClose}
      summary={
        <>
          <p className="truncate text-sm text-white">{form.title || 'Untitled request'}</p>
          <div className="flex items-end justify-between gap-2">
            <span className="truncate text-xs text-white/50">{project?.name ?? 'No project yet'}</span>
            <span className="text-xl font-bold text-white">{money(form.estimated_amount)}</span>
          </div>
          <div className="flex items-center gap-1.5 border-t border-white/10 pt-3 text-[11px] text-white/55">
            <span className="rounded-full bg-[var(--sun)] px-2 py-0.5 font-semibold text-[var(--ink)]">Finance</span>
            <ArrowRight size={12} />
            <span>GM</span>
            <ArrowRight size={12} />
            <span>Owner</span>
          </div>
        </>
      }
    >
          {step === 0 && (
            <>
              <Field label="Title" error={err(0, !form.title.trim())}>
                <input
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. Structural steel beams"
                  className={clsx(inputClass, 'text-base', err(0, !form.title.trim()) ? 'border-[var(--accent)]' : 'border-transparent')}
                />
              </Field>

              <Field label="Project" error={err(0, !form.project_id)}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {projects.map((p) => {
                    const active = form.project_id === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => update('project_id', p.id)}
                        aria-pressed={active}
                        className={clsx(
                          'focus-ring flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
                          active ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-black/10 hover:border-black/30',
                        )}
                      >
                        <span
                          className={clsx(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--canvas)] text-[var(--ink)]',
                          )}
                        >
                          <Building2 size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className={clsx('block truncate text-xs', active ? 'text-white/55' : 'text-slate-500')}>
                            {p.code}
                            {p.client_name ? ` · ${p.client_name}` : ''}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                  {projects.length === 0 && <p className="text-sm text-slate-500">Loading projects…</p>}
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_14rem]">
                <Field label="Description" optional>
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    rows={3}
                    placeholder="What is this purchase for?"
                    className={clsx(inputClass, 'resize-none border-transparent')}
                  />
                </Field>
                <Field label="Department" optional>
                  <input
                    value={form.department}
                    onChange={(e) => update('department', e.target.value)}
                    placeholder="General"
                    className={clsx(inputClass, 'border-transparent')}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Estimated amount" error={err(1, !(Number(form.estimated_amount) > 0))}>
                <div
                  className={clsx(
                    'flex items-center gap-2 rounded-[1.5rem] border bg-[var(--canvas)] px-5 py-4 transition-colors focus-within:border-[var(--ink)] focus-within:bg-white',
                    err(1, !(Number(form.estimated_amount) > 0)) ? 'border-[var(--accent)]' : 'border-transparent',
                  )}
                >
                  <span className="text-4xl font-black text-slate-300">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.estimated_amount}
                    onChange={(e) => update('estimated_amount', e.target.value)}
                    placeholder="0"
                    className="w-full min-w-0 bg-transparent text-4xl font-black tracking-tight text-[var(--ink)] outline-none placeholder:text-slate-300 sm:text-5xl"
                  />
                </div>
              </Field>

              <Field label="Needed by" optional>
                <div className="relative">
                  <CalendarDays size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={form.required_date}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => update('required_date', e.target.value)}
                    className={clsx(inputClass, 'border-transparent pl-11')}
                  />
                </div>
              </Field>

              <Field label="Justification" optional>
                <textarea
                  value={form.justification}
                  onChange={(e) => update('justification', e.target.value)}
                  rows={4}
                  placeholder="Why is this needed? Finance reads this first."
                  className={clsx(inputClass, 'resize-none border-transparent')}
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-[var(--ink-soft)]">
                Attach vendor quotes now to speed up Finance review. You can also add them later.
              </p>
              <div className="space-y-3">
                {quotations.map((q, i) => {
                  const isLowest = lowestQuote !== null && validQuotes.length > 1 && Number(q.amount) === lowestQuote
                  return (
                    <div key={i} className="rounded-[1.5rem] border border-black/10 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                          Quote {i + 1}
                          {isLowest && (
                            <span className="rounded-full bg-[var(--sun)] px-2 py-0.5 text-[11px] font-semibold">Lowest</span>
                          )}
                        </span>
                        {quotations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setQuotations((rows) => rows.filter((_, idx) => idx !== i))}
                            aria-label={`Remove quote ${i + 1}`}
                            className="focus-ring rounded-full p-1.5 text-slate-400 transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem]">
                        <select
                          value={q.vendor_id}
                          onChange={(e) => updateQuotation(i, { vendor_id: e.target.value })}
                          className={clsx(inputClass, 'border-transparent')}
                        >
                          <option value="">Select vendor</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          placeholder="Amount ($)"
                          value={q.amount}
                          onChange={(e) => updateQuotation(i, { amount: e.target.value })}
                          className={clsx(inputClass, 'border-transparent')}
                        />
                      </div>
                      <input
                        placeholder="Notes (optional)"
                        value={q.notes}
                        onChange={(e) => updateQuotation(i, { notes: e.target.value })}
                        className={clsx(inputClass, 'mt-2 border-transparent')}
                      />
                      <DropZone file={q.file} onFile={(file) => updateQuotation(i, { file })} />
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setQuotations((rows) => [...rows, { ...EMPTY_QUOTATION }])}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-black/10 py-4 text-sm font-medium text-[var(--ink)] transition-colors hover:border-black/30"
              >
                <Plus size={16} />
                Add another quote
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-[1.5rem] bg-[var(--canvas)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{project?.name}</p>
                    <p className="mt-1 text-xl font-bold text-[var(--ink)]">{form.title}</p>
                    {form.description && <p className="mt-1 text-sm text-[var(--ink-soft)]">{form.description}</p>}
                  </div>
                  <p className="text-4xl font-black tracking-tight text-[var(--ink)]">{money(form.estimated_amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ReviewTile label="Department" value={form.department || 'General'} onEdit={() => setStep(0)} />
                <ReviewTile
                  label="Needed by"
                  value={form.required_date ? format(new Date(`${form.required_date}T00:00`), 'MMM d, yyyy') : 'Not set'}
                  onEdit={() => setStep(1)}
                />
                <ReviewTile
                  label="Quotations"
                  value={validQuotes.length ? `${validQuotes.length} · lowest ${money(lowestQuote ?? 0)}` : 'None yet'}
                  onEdit={() => setStep(2)}
                />
              </div>

              {form.justification && (
                <div className="rounded-[1.5rem] border border-black/10 p-5">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Justification</p>
                  <p className="mt-2 text-sm text-[var(--ink)]">{form.justification}</p>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-[1.5rem] bg-[var(--sun-soft)] p-4 text-sm text-[var(--ink)]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sun)]">
                  <ArrowRight size={16} />
                </span>
                Goes to Finance first, then the General Manager and Owner.
              </div>
            </>
          )}
    </StepModal>
  )
}

function DropZone({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  const [over, setOver] = useState(false)

  if (file) {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-[var(--canvas)] px-4 py-3">
        <FileText size={18} className="shrink-0 text-[var(--accent)]" />
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">{file.name}</span>
        <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
        <button
          type="button"
          onClick={() => onFile(null)}
          aria-label="Remove file"
          className="focus-ring rounded-full p-1 text-slate-400 hover:text-[var(--ink)]"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFile(e.dataTransfer.files?.[0] ?? null)
      }}
      className={clsx(
        'mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 text-sm transition-colors',
        over ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-black/10 text-slate-500 hover:border-black/25',
      )}
    >
      <Upload size={16} />
      <span>
        Drop the quote file or <span className="font-semibold text-[var(--ink)] underline underline-offset-2">browse</span>
      </span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}
