import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatCard } from '@/components/ui/StatCard'
import { StatStrip } from '@/components/ui/StatStrip'
import { StatusBadge, LaborStatusBadge } from '@/components/ui/StatusBadge'
import { ROLE_LABELS, type PurchaseRequest, type LaborRequest, type AuditEvent, type RequestStatus } from '@/types'

const AWAITING_BY_ROLE: Record<string, RequestStatus | null> = {
  employee: null,
  finance: 'awaiting_finance',
  general_manager: 'awaiting_gm',
  owner: 'awaiting_owner',
  admin: null,
}

const PIE_COLORS = ['#8b97a3', '#e8a33d', '#4f8ef7', '#ef5a5a', '#a478e8', '#3fb87f']

export function Dashboard() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [labor, setLabor] = useState<LaborRequest[]>([])
  const [activity, setActivity] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [reqRes, laborRes, auditRes] = await Promise.all([
        supabase.from('purchase_requests').select('*, project:projects(*), requester:profiles(*)').order('created_at', { ascending: false }),
        supabase.from('labor_requests').select('*, project:projects(*)').order('created_at', { ascending: false }),
        supabase.from('audit_events').select('*, actor:profiles(*)').order('created_at', { ascending: false }).limit(8),
      ])
      setRequests((reqRes.data as PurchaseRequest[]) ?? [])
      setLabor((laborRes.data as LaborRequest[]) ?? [])
      setActivity((auditRes.data as AuditEvent[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (!profile) return null

  const myScope = profile.role === 'employee' ? requests.filter((r) => r.requester_id === profile.id) : requests
  const awaitingStatus = AWAITING_BY_ROLE[profile.role]
  const pendingMyAction = awaitingStatus ? requests.filter((r) => r.status === awaitingStatus).length : 0
  const activeLabor = labor.filter((l) => !['completed', 'cancelled'].includes(l.status)).length
  const approvedAmount = requests
    .filter((r) => ['approved', 'purchased', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.approved_amount ?? r.estimated_amount ?? 0), 0)
  const delayed = requests.filter((r) => r.required_date && new Date(r.required_date) < new Date() && !['completed', 'purchased'].includes(r.status)).length

  const statusData = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {}),
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))

  const spendByProject = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      const key = r.project?.name ?? 'Unassigned'
      acc[key] = (acc[key] ?? 0) + Number(r.estimated_amount ?? 0)
      return acc
    }, {}),
  ).map(([name, value]) => ({ name, value }))

  const actionQueue = awaitingStatus ? requests.filter((r) => r.status === awaitingStatus) : myScope.slice(0, 5)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--emerald-500)]">
          {ROLE_LABELS[profile.role]} view
        </p>
        <h1 className="text-2xl font-bold">Welcome back, {profile.full_name.split(' ')[0]}</h1>
      </div>

      <StatStrip>
        <StatCard label={awaitingStatus ? 'Awaiting My Action' : 'My Requests'} value={awaitingStatus ? pendingMyAction : myScope.length} accent="gold" />
        <StatCard label="Approved Spend" value={approvedAmount} prefix="$" accent="green" />
        <StatCard label="Active Labor Requests" value={activeLabor} accent="emerald" />
        <StatCard label="Delayed Requests" value={delayed} accent="red" />
      </StatStrip>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-[var(--ink)]">Spend by Project</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendByProject}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,25,42,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8b97a3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b97a3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid rgba(16,25,42,0.1)', borderRadius: 12, fontSize: 12 }}
                cursor={{ fill: 'rgba(16,25,42,0.04)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#e8a33d" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--ink)]">Requests by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(16,25,42,0.1)', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              {awaitingStatus ? 'Requests Awaiting Your Review' : 'Recent Requests'}
            </h3>
            <Link to="/requests" className="text-xs font-medium text-[var(--emerald-500)] hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {loading && <p className="py-6 text-center text-sm text-slate-500">Loading…</p>}
            {!loading && actionQueue.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Nothing here right now.</p>
            )}
            {actionQueue.map((r) => (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className="focus-ring flex items-center justify-between rounded-xl border border-black/5 bg-black/[0.025] px-3.5 py-3 transition-colors hover:bg-black/[0.045]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.request_number} · {r.project?.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-600">${Number(r.estimated_amount).toLocaleString()}</span>
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Recent Activity</h3>
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-2.5 text-xs">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--emerald-500)]" />
                <div>
                  <p className="text-slate-600">{a.description}</p>
                  <p className="mt-0.5 text-slate-500">{a.actor?.full_name ?? 'System'}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
          </div>
        </GlassCard>
      </div>

      {labor.length > 0 && (
        <GlassCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Active Labor Requests</h3>
            <Link to="/labor" className="text-xs font-medium text-[var(--emerald-500)] hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {labor.slice(0, 3).map((l) => (
              <div key={l.id} className="rounded-xl border border-black/5 bg-black/[0.025] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{l.request_number}</span>
                  <LaborStatusBadge status={l.status} />
                </div>
                <p className="text-sm font-medium text-[var(--ink)]">{l.labor_type}</p>
                <p className="text-xs text-slate-500">{l.workers_required} workers · {l.location}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
