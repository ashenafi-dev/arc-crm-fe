import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { attachFile } from '@/lib/storage'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import type { Project, Vendor } from '@/types'

interface QuotationRow {
  vendor_id: string
  amount: string
  notes: string
  file: File | null
}

const EMPTY_QUOTATION: QuotationRow = { vendor_id: '', amount: '', notes: '', file: null }

export function NewRequest() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [busy, setBusy] = useState(false)
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
    supabase.from('projects').select('*').eq('is_active', true).then(({ data }) => setProjects((data as Project[]) ?? []))
    supabase.from('vendors').select('*').eq('is_active', true).then(({ data }) => setVendors((data as Vendor[]) ?? []))
  }, [])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateQuotation(index: number, patch: Partial<QuotationRow>) {
    setQuotations((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!form.title || !form.project_id || !form.estimated_amount) {
      toast.error('Fill in title, project, and estimated amount')
      return
    }
    setBusy(true)

    const requestNumber = `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`

    const { data, error } = await supabase
      .from('purchase_requests')
      .insert({
        request_number: requestNumber,
        title: form.title,
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
      toast.error(error?.message ?? 'Could not create request')
      return
    }

    const validQuotations = quotations.filter((q) => q.vendor_id && q.amount)
    for (const q of validQuotations) {
      const { data: quoteRow, error: quoteError } = await supabase
        .from('vendor_quotations')
        .insert({
          purchase_request_id: data.id,
          vendor_id: q.vendor_id,
          amount: Number(q.amount),
          notes: q.notes || null,
        })
        .select()
        .single()

      if (quoteError) {
        toast.error(`Quotation not saved: ${quoteError.message}`)
        continue
      }
      if (q.file && quoteRow) {
        const { error: fileError } = await attachFile(data.id, q.file, 'quotation', profile.id, `Quotation from vendor`)
        if (fileError) toast.error(`File upload failed: ${fileError}`)
      }
    }

    await supabase.from('approvals').insert({ purchase_request_id: data.id, stage: 'finance', decision: 'pending' })
    await supabase.from('audit_events').insert({
      actor_id: profile.id,
      action: 'purchase_submitted',
      entity_type: 'purchase_request',
      entity_id: data.id,
      description: `${profile.full_name} submitted "${form.title}" for Finance review.`,
    })

    setBusy(false)
    toast.success('Request submitted for Finance review')
    navigate(`/requests/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">New Purchase Request</h1>

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              placeholder="e.g. Structural steel beams"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              placeholder="What is this purchase for?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Project">
              <select
                value={form.project_id}
                onChange={(e) => update('project_id', e.target.value)}
                className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-slate-700"
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <input
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
                className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Amount ($)">
              <input
                type="number"
                value={form.estimated_amount}
                onChange={(e) => update('estimated_amount', e.target.value)}
                className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              />
            </Field>
            <Field label="Required Date">
              <input
                type="date"
                value={form.required_date}
                onChange={(e) => update('required_date', e.target.value)}
                className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              />
            </Field>
          </div>

          <Field label="Justification">
            <textarea
              value={form.justification}
              onChange={(e) => update('justification', e.target.value)}
              rows={2}
              className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              placeholder="Why is this needed?"
            />
          </Field>

          <div className="border-t border-black/10 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Vendor Quotations
              </label>
              <button
                type="button"
                onClick={() => setQuotations((rows) => [...rows, { ...EMPTY_QUOTATION }])}
                className="focus-ring text-xs font-medium text-[var(--emerald-500)] hover:underline"
              >
                + Add quotation
              </button>
            </div>
            <div className="space-y-3">
              {quotations.map((q, i) => (
                <div key={i} className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={q.vendor_id}
                      onChange={(e) => updateQuotation(i, { vendor_id: e.target.value })}
                      className="focus-ring rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-slate-700"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quoted amount ($)"
                      value={q.amount}
                      onChange={(e) => updateQuotation(i, { amount: e.target.value })}
                      className="focus-ring rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-[var(--ink)]"
                    />
                  </div>
                  <input
                    placeholder="Notes (optional)"
                    value={q.notes}
                    onChange={(e) => updateQuotation(i, { notes: e.target.value })}
                    className="focus-ring mt-2 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-[var(--ink)]"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                      onChange={(e) => updateQuotation(i, { file: e.target.files?.[0] ?? null })}
                      className="focus-ring flex-1 text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-black/[0.06] file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-[var(--ink)]"
                    />
                    {quotations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuotations((rows) => rows.filter((_, idx) => idx !== i))}
                        className="focus-ring text-xs text-[var(--status-red)] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" loading={busy} className="w-full justify-center">
            Submit for Finance Review
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  )
}
