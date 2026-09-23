import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { FolderKanban, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, useConfirm } from '@/components/ui'
import { Field, FormModal, Toggle } from '@/components/admin/FormModal'
import { notify } from '@/lib/notify'
import { supabase } from '@/lib/supabase'
import type { Project, RequestStatus } from '@/types'
import { ActivePill, EmptyCard, ListCard } from './shared'

// Money counts as spent once it is approved; paid amounts replace approvals when known
const SPENT: RequestStatus[] = ['approved', 'purchased', 'completed']
const TEMPLATE = 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.8fr)_6rem_5rem]'
const money = (n: number) => `$${Math.round(n).toLocaleString()}`

type SpendRow = { project_id: string; status: RequestStatus; approved_amount: number | null; actual_amount: number | null; estimated_amount: number }

export function ProjectsTab() {
  const confirm = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [spend, setSpend] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  // undefined = closed, null = new project
  const [editing, setEditing] = useState<Project | null | undefined>(undefined)

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('purchase_requests').select('project_id, status, approved_amount, actual_amount, estimated_amount').in('status', SPENT),
    ]).then(([p, r]) => {
      if (p.error) notify.error('Could not load projects')
      const totals: Record<string, number> = {}
      for (const row of (r.data ?? []) as SpendRow[]) {
        totals[row.project_id] = (totals[row.project_id] ?? 0) + Number(row.actual_amount ?? row.approved_amount ?? row.estimated_amount ?? 0)
      }
      setProjects((p.data as Project[]) ?? [])
      setSpend(totals)
      setLoading(false)
    })
  }, [])

  function upsert(p: Project) {
    setProjects((list) => (list.some((i) => i.id === p.id) ? list.map((i) => (i.id === p.id ? p : i)) : [...list, p]).sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function remove(p: Project) {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      body: 'Projects with purchase or labor requests cannot be deleted. Archive those instead so history stays intact.',
      confirmLabel: 'Delete project',
      tone: 'danger',
      icon: Trash2,
    })
    if (!ok) return
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    if (error) {
      notify.error(error.code === '23503' ? 'Project has requests, archive it instead' : `Could not delete project: ${error.message}`)
      return
    }
    setProjects((list) => list.filter((i) => i.id !== p.id))
    notify.success('Project deleted')
  }

  const archived = projects.filter((p) => !p.is_active).length
  const visible = projects.filter((p) => showArchived || p.is_active)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button className="chip focus-ring" aria-pressed={!showArchived} onClick={() => setShowArchived(false)}>
            Active <span className="text-xs opacity-60">{projects.length - archived}</span>
          </button>
          <button className="chip focus-ring" aria-pressed={showArchived} onClick={() => setShowArchived(true)}>
            All <span className="text-xs opacity-60">{projects.length}</span>
          </button>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus size={16} />
          Add project
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading projects…</p>
      ) : visible.length === 0 ? (
        <EmptyCard icon={FolderKanban} title="No projects yet" body="Requests are raised against a project, so add one first." />
      ) : (
        <ListCard columns={['Project', 'Spend vs budget', 'Status', '']} template={TEMPLATE}>
          {visible.map((p) => {
            const spent = spend[p.id] ?? 0
            const budget = Number(p.budget ?? 0)
            const pct = budget > 0 ? (spent / budget) * 100 : 0
            const over = budget > 0 && spent > budget
            return (
              <li key={p.id} className={clsx('grid grid-cols-1 gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-[var(--canvas)] md:items-center md:gap-4', TEMPLATE)}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--ink)] px-2.5 py-0.5 text-[11px] font-semibold text-white">{p.code}</span>
                      <span className="md:hidden">
                        <ActivePill active={p.is_active} />
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-[var(--ink)]">{p.name}</p>
                    <p className="flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                      {p.client_name || 'No client'}
                      {p.location && (
                        <>
                          <span>·</span>
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--ink)]">{money(spent)}</span>
                    <span className={clsx(over ? 'font-semibold text-[var(--accent)]' : 'text-slate-500')}>
                      {budget > 0 ? `${Math.round(pct)}% of ${money(budget)}` : 'No budget set'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--canvas)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${budget > 0 ? Math.min(100, pct) : 0}%`,
                        background: over ? 'var(--accent)' : pct > 80 ? 'var(--sun)' : 'var(--ink)',
                      }}
                    />
                  </div>
                </div>

                <div className="hidden md:block">
                  <ActivePill active={p.is_active} />
                </div>

                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setEditing(p)}
                    aria-label={`Edit ${p.name}`}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[var(--ink)] hover:bg-white"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(p)}
                    aria-label={`Delete ${p.name}`}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          })}
        </ListCard>
      )}

      {editing !== undefined && <ProjectModal project={editing} onClose={() => setEditing(undefined)} onSaved={upsert} />}
    </div>
  )
}

function ProjectModal({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: (p: Project) => void }) {
  const [name, setName] = useState(project?.name ?? '')
  const [code, setCode] = useState(project?.code ?? '')
  const [client, setClient] = useState(project?.client_name ?? '')
  const [location, setLocation] = useState(project?.location ?? '')
  const [budget, setBudget] = useState(project?.budget != null ? String(project.budget) : '')
  const [active, setActive] = useState(project?.is_active ?? true)
  const [touched, setTouched] = useState(false)

  const budgetNum = budget.trim() ? Number(budget) : null
  const errors = {
    name: touched && !name.trim() ? 'Required' : null,
    code: touched && !code.trim() ? 'Required' : null,
    budget: touched && budgetNum != null && (Number.isNaN(budgetNum) || budgetNum < 0) ? 'Enter a positive number' : null,
  }

  async function submit() {
    setTouched(true)
    if (!name.trim() || !code.trim() || (budgetNum != null && (Number.isNaN(budgetNum) || budgetNum < 0))) return false
    const row = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      client_name: client.trim() || null,
      location: location.trim() || null,
      budget: budgetNum,
      is_active: active,
    }
    const query = project ? supabase.from('projects').update(row).eq('id', project.id) : supabase.from('projects').insert(row)
    const { data, error } = await query.select().single()
    if (error || !data) {
      notify.error(error?.code === '23505' ? 'That project code is already used' : `Could not save project: ${error?.message ?? 'no permission'}`)
      return false
    }
    notify.success(project ? 'Project details saved' : 'Project created and ready for requests')
    onSaved(data as Project)
    return true
  }

  return (
    <FormModal
      title={project ? 'Edit project' : 'New project'}
      description="Requests are raised against a project and tracked against its budget."
      icon={FolderKanban}
      submitLabel={project ? 'Save changes' : 'Create project'}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label="Project name" htmlFor="pr-name" error={errors.name}>
          <input id="pr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Riverside Office Renovation" className={errors.name ? 'field !border-[var(--accent)]' : 'field'} />
        </Field>
        <Field label="Code" htmlFor="pr-code" error={errors.code}>
          <input id="pr-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="RVS-01" className={errors.code ? 'field uppercase !border-[var(--accent)]' : 'field uppercase'} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Client" htmlFor="pr-client" hint="Optional">
          <input id="pr-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" className="field" />
        </Field>
        <Field label="Location" htmlFor="pr-location" hint="Optional">
          <input id="pr-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site address or city" className="field" />
        </Field>
      </div>
      <Field label="Budget ($)" htmlFor="pr-budget" hint="Optional" error={errors.budget}>
        <input
          id="pr-budget"
          type="number"
          min={0}
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="250000"
          className={errors.budget ? 'field !border-[var(--accent)]' : 'field'}
        />
      </Field>
      <Toggle checked={active} onChange={setActive} label="Active project" description="Archived projects are hidden from new requests" />
    </FormModal>
  )
}
