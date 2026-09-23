import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, useConfirm } from '@/components/ui'
import { Field, FormModal, Toggle } from '@/components/admin/FormModal'
import { notify } from '@/lib/notify'
import { supabase } from '@/lib/supabase'
import type { Department } from '@/types'
import { ActivePill, EmptyCard, ListCard } from './shared'

const TEMPLATE = 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem_5rem]'

export function DepartmentsTab() {
  const confirm = useConfirm()
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // undefined = closed, null = new department
  const [editing, setEditing] = useState<Department | null | undefined>(undefined)

  useEffect(() => {
    Promise.all([supabase.from('departments').select('*').order('name'), supabase.from('profiles').select('department')]).then(([d, p]) => {
      if (d.error) notify.error('Could not load departments')
      const counts: Record<string, number> = {}
      for (const row of (p.data ?? []) as { department: string | null }[]) {
        if (row.department) counts[row.department] = (counts[row.department] ?? 0) + 1
      }
      setDepartments((d.data as Department[]) ?? [])
      setMembers(counts)
      setLoading(false)
    })
  }, [])

  function upsert(d: Department) {
    setDepartments((list) => (list.some((i) => i.id === d.id) ? list.map((i) => (i.id === d.id ? d : i)) : [...list, d]).sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function remove(d: Department) {
    const count = members[d.name] ?? 0
    const ok = await confirm({
      title: `Delete ${d.name}?`,
      body: count
        ? `${count} ${count === 1 ? 'person is' : 'people are'} still in this department. They keep the name until you move them, so archiving is usually safer.`
        : 'Past requests keep their department name. This only removes it from the list.',
      confirmLabel: 'Delete department',
      tone: 'danger',
      icon: Trash2,
    })
    if (!ok) return
    const { error } = await supabase.from('departments').delete().eq('id', d.id)
    if (error) {
      notify.error(`Could not delete department: ${error.message}`)
      return
    }
    setDepartments((list) => list.filter((i) => i.id !== d.id))
    notify.success('Department deleted')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="px-1 text-sm text-[var(--ink-soft)]">
          {departments.filter((d) => d.is_active).length} active of {departments.length}
        </p>
        <Button onClick={() => setEditing(null)}>
          <Plus size={16} />
          Add department
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading departments…</p>
      ) : departments.length === 0 ? (
        <EmptyCard icon={Building2} title="No departments yet" body="Add the teams your people and requests belong to." />
      ) : (
        <ListCard columns={['Department', 'People', 'Status', '']} template={TEMPLATE}>
          {departments.map((d) => (
            <li key={d.id} className={clsx('flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[var(--canvas)] md:grid md:gap-4', TEMPLATE)}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--canvas)] text-[var(--ink)]">
                  <Building2 size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">{d.name}</p>
                  <p className="text-xs text-slate-500 md:hidden">
                    {members[d.name] ?? 0} people · {d.is_active ? 'Active' : 'Archived'}
                  </p>
                </div>
              </div>
              <p className="hidden text-sm text-[var(--ink-soft)] md:block">{members[d.name] ?? 0}</p>
              <div className="hidden md:block">
                <ActivePill active={d.is_active} />
              </div>
              <div className="flex shrink-0 justify-end gap-1.5">
                <button
                  onClick={() => setEditing(d)}
                  aria-label={`Edit ${d.name}`}
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[var(--ink)] hover:bg-white"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => remove(d)}
                  aria-label={`Delete ${d.name}`}
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ListCard>
      )}

      {editing !== undefined && <DepartmentModal department={editing} onClose={() => setEditing(undefined)} onSaved={upsert} />}
    </div>
  )
}

function DepartmentModal({ department, onClose, onSaved }: { department: Department | null; onClose: () => void; onSaved: (d: Department) => void }) {
  const [name, setName] = useState(department?.name ?? '')
  const [active, setActive] = useState(department?.is_active ?? true)
  const [touched, setTouched] = useState(false)
  const nameError = touched && !name.trim() ? 'Required' : null
  const renamed = !!department && name.trim() !== department.name

  async function submit() {
    setTouched(true)
    if (!name.trim()) return false
    const row = { name: name.trim(), is_active: active }
    const query = department ? supabase.from('departments').update(row).eq('id', department.id) : supabase.from('departments').insert(row)
    const { data, error } = await query.select().single()
    if (error || !data) {
      notify.error(error?.code === '23505' ? 'A department with that name exists' : `Could not save department: ${error?.message ?? 'no permission'}`)
      return false
    }
    notify.success(department ? 'Department saved' : 'Department added')
    onSaved(data as Department)
    return true
  }

  return (
    <FormModal
      title={department ? 'Edit department' : 'New department'}
      description="People and purchase requests are grouped by department."
      icon={Building2}
      submitLabel={department ? 'Save changes' : 'Add department'}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Name" htmlFor="d-name" error={nameError}>
        <input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Architecture" className={nameError ? 'field !border-[var(--accent)]' : 'field'} />
      </Field>
      {renamed && (
        <p className="rounded-2xl bg-[var(--sun-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--ink)]">
          People and past requests keep the old name. Move people over from the Users tab.
        </p>
      )}
      <Toggle checked={active} onChange={setActive} label="Active department" description="Archived departments can't be picked for people" />
    </FormModal>
  )
}
