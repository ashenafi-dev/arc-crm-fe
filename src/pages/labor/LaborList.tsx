import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { LaborStatusBadge } from '@/components/ui/StatusBadge'
import type { LaborRequest, LaborStatus, Project } from '@/types'

const NEXT: Partial<Record<LaborStatus, LaborStatus>> = {
  requested: 'reviewed',
  reviewed: 'assigned',
  assigned: 'in_progress',
  in_progress: 'completed',
}

function AssigneeField({ labor, onSaved }: { labor: LaborRequest; onSaved: () => void }) {
  const [value, setValue] = useState(labor.assigned_to ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('labor_requests').update({ assigned_to: value || null }).eq('id', labor.id)
    setBusy(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Assignee updated')
      onSaved()
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Assign to…"
        className="focus-ring flex-1 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-xs text-[var(--ink)]"
      />
      <Button variant="outline" onClick={save} loading={busy} className="px-2.5 py-1.5 text-xs">Save</Button>
    </div>
  )
}

export function LaborList() {
  const { profile } = useAuth()
  const [labor, setLabor] = useState<LaborRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState({ project_id: '', labor_type: '', workers_required: '1', location: '', description: '', required_at: '' })

  async function load() {
    const { data } = await supabase.from('labor_requests').select('*, project:projects(*)').order('created_at', { ascending: false })
    setLabor((data as LaborRequest[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('projects').select('*').then(({ data }) => setProjects((data as Project[]) ?? []))
  }, [])

  async function advance(l: LaborRequest) {
    const next = NEXT[l.status]
    if (!next) return
    const { error } = await supabase.from('labor_requests').update({ status: next }).eq('id', l.id)
    if (error) toast.error(error.message)
    else {
      toast.success(`Moved to ${next.replace('_', ' ')}`)
      load()
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!form.project_id || !form.labor_type || !form.location || !form.required_at) {
      toast.error('Fill in all required fields')
      return
    }
    const requestNumber = `LR-2026-${Math.floor(1000 + Math.random() * 9000)}`
    const { error } = await supabase.from('labor_requests').insert({
      request_number: requestNumber,
      project_id: form.project_id,
      requested_by: profile.id,
      labor_type: form.labor_type,
      workers_required: Number(form.workers_required),
      location: form.location,
      description: form.description,
      required_at: new Date(form.required_at).toISOString(),
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Labor request created')
      setShowForm(false)
      setForm({ project_id: '', labor_type: '', workers_required: '1', location: '', description: '', required_at: '' })
      load()
    }
  }

  const canAdvance = profile?.role === 'admin' || profile?.role === 'general_manager' || profile?.role === 'owner'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Labor Requests</h1>
          <p className="text-sm text-slate-400">{labor.length} requests</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ New Labor Request'}</Button>
      </div>

      {showForm && (
        <GlassCard strong className="p-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))} className="focus-ring rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-slate-700">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Labor type (e.g. Electricians)" value={form.labor_type} onChange={(e) => setForm((f) => ({ ...f, labor_type: e.target.value }))} className="focus-ring rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]" />
            <input type="number" placeholder="Workers required" value={form.workers_required} onChange={(e) => setForm((f) => ({ ...f, workers_required: e.target.value }))} className="focus-ring rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]" />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="focus-ring rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]" />
            <input type="datetime-local" value={form.required_at} onChange={(e) => setForm((f) => ({ ...f, required_at: e.target.value }))} className="focus-ring rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]" />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="focus-ring rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)]" />
            <Button type="submit" className="md:col-span-2 justify-center">Create Labor Request</Button>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-slate-500">Loading…</p>}
        {!loading && labor.length === 0 && <p className="text-slate-500">No labor requests yet.</p>}
        {labor.map((l) => (
          <GlassCard key={l.id} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">{l.request_number}</span>
              <LaborStatusBadge status={l.status} />
            </div>
            <p className="font-medium text-[var(--ink)]">{l.labor_type}</p>
            <p className="mt-1 text-xs text-slate-400">{l.project?.name}</p>
            <p className="mt-2 text-sm text-slate-600">{l.workers_required} workers · {l.location}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date(l.required_at).toLocaleString()}</p>
            {l.assigned_to && (
              <p className="mt-2 text-xs font-medium text-[var(--emerald-500)]">Assigned to {l.assigned_to}</p>
            )}
            {canAdvance && <AssigneeField labor={l} onSaved={load} />}
            {canAdvance && NEXT[l.status] && (
              <Button variant="outline" className="mt-2 w-full justify-center" onClick={() => advance(l)}>
                Move to {NEXT[l.status]?.replace('_', ' ')}
              </Button>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
