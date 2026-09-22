import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { STATUS_LABELS, type PurchaseRequest, type RequestStatus } from '@/types'

export function RequestList() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('purchase_requests')
        .select('*, project:projects(*), requester:profiles(*)')
        .order('created_at', { ascending: false })
      setRequests((data as PurchaseRequest[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) || r.request_number.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesScope = profile?.role !== 'employee' || r.requester_id === profile.id
    return matchesSearch && matchesStatus && matchesScope
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Purchase Requests</h1>
          <p className="text-sm text-slate-400">{filtered.length} requests</p>
        </div>
        <Link to="/requests/new">
          <Button>+ New Request</Button>
        </Link>
      </div>

      <GlassCard className="flex flex-wrap items-center gap-3 p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or request number…"
          className="focus-ring min-w-[220px] flex-1 rounded-lg border border-black/10 bg-black/[0.03] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-slate-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
          className="focus-ring rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Request</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Requester</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No requests match.</td></tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => (window.location.href = `/requests/${r.id}`)}
                className="cursor-pointer border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.03]"
              >
                <td className="px-4 py-3">
                  <Link to={`/requests/${r.id}`} className="focus-ring block">
                    <p className="font-medium text-[var(--ink)]">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.request_number}</p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.project?.name}</td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{r.requester?.full_name}</td>
                <td className="px-4 py-3 font-medium text-slate-700">${Number(r.estimated_amount).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}
