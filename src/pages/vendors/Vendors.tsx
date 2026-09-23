import { useEffect, useState } from 'react'
import { Mail, Phone, Store, User } from 'lucide-react'
import { Avatar, PageHeader } from '@/components/ui'
import { getInitials } from '@/utils'
import { fetchVendors } from '@/services'
import type { Vendor } from '@/types'

export function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [service, setService] = useState<string | null>(null)

  useEffect(() => {
    fetchVendors().then((v) => {
      setVendors(v)
      setLoading(false)
    })
  }, [])

  const servicesOf = (v: Vendor) => (v.services ?? '').split(/,\s*/).filter(Boolean)
  const allServices = [...new Set(vendors.flatMap(servicesOf))].sort()
  const filtered = vendors.filter((v) => !service || servicesOf(v).includes(service))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendors"
        count={filtered.length}
        subtitle="Suppliers and contractors you can quote from"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className="chip focus-ring" aria-pressed={service === null} onClick={() => setService(null)}>
          All
          <span className="text-xs opacity-60">{vendors.length}</span>
        </button>
        {allServices.map((sv) => (
          <button key={sv} className="chip focus-ring" aria-pressed={service === sv} onClick={() => setService(sv)}>
            {sv}
            <span className="text-xs opacity-60">{vendors.filter((v) => servicesOf(v).includes(sv)).length}</span>
          </button>
        ))}
      </div>

      {loading && <p className="py-16 text-center text-sm text-slate-500">Loading vendors…</p>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--canvas)] text-slate-400">
            <Store size={24} />
          </span>
          <p className="text-lg font-bold text-[var(--ink)]">No vendors found</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v, i) => (
          <article key={v.id} className="flex flex-col rounded-[1.5rem] bg-white p-5">
            <div className="flex items-center gap-3">
              <Avatar initials={getInitials(v.name)} index={i} size={46} />
              <p className="min-w-0 flex-1 text-lg leading-tight font-bold text-[var(--ink)]">{v.name}</p>
            </div>
            {v.services && (
              <div className="mt-4 mb-4 flex flex-wrap gap-1.5">
                {v.services.split(/,\s*/).filter(Boolean).map((s) => (
                  <span key={s} className="rounded-full bg-[var(--canvas)] px-2.5 py-1 text-xs text-[var(--ink)]">{s}</span>
                ))}
              </div>
            )}
            <div className="mt-auto space-y-1 border-t border-black/[0.06] pt-4 text-sm">
              {v.contact_person && (
                <p className="flex items-center gap-2.5 text-[var(--ink)]">
                  <User size={15} className="shrink-0 text-slate-400" />
                  {v.contact_person}
                </p>
              )}
              {v.phone && (
                <a href={`tel:${v.phone}`} className="flex items-center gap-2.5 text-[var(--ink-soft)] hover:text-[var(--accent)]">
                  <Phone size={15} className="shrink-0 text-slate-400" />
                  {v.phone}
                </a>
              )}
              {v.email && (
                <a href={`mailto:${v.email}`} className="flex min-w-0 items-center gap-2.5 text-[var(--ink-soft)] hover:text-[var(--accent)]">
                  <Mail size={15} className="shrink-0 text-slate-400" />
                  <span className="truncate">{v.email}</span>
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
