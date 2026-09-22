import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import type { Project } from '@/types'

export function NewRequest() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [busy, setBusy] = useState(false)
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
  }, [])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
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
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              placeholder="e.g. Structural steel beams"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              placeholder="What is this purchase for?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Project">
              <select
                value={form.project_id}
                onChange={(e) => update('project_id', e.target.value)}
                className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200"
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
                className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Amount ($)">
              <input
                type="number"
                value={form.estimated_amount}
                onChange={(e) => update('estimated_amount', e.target.value)}
                className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              />
            </Field>
            <Field label="Required Date">
              <input
                type="date"
                value={form.required_date}
                onChange={(e) => update('required_date', e.target.value)}
                className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              />
            </Field>
          </div>

          <Field label="Justification">
            <textarea
              value={form.justification}
              onChange={(e) => update('justification', e.target.value)}
              rows={2}
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              placeholder="Why is this needed?"
            />
          </Field>

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
