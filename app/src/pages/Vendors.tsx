import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import type { Vendor } from '@/types'

export function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    supabase.from('vendors').select('*').order('name').then(({ data }) => setVendors((data as Vendor[]) ?? []))
  }, [])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Vendors</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <GlassCard key={v.id} className="p-5">
            <p className="font-semibold text-white">{v.name}</p>
            <p className="mt-1 text-xs text-slate-500">{v.services}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>{v.contact_person}</p>
              <p className="text-slate-400">{v.phone}</p>
              <p className="text-slate-400">{v.email}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
