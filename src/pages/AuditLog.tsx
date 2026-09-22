import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import type { AuditEvent } from '@/types'

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])

  useEffect(() => {
    supabase
      .from('audit_events')
      .select('*, actor:profiles(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setEvents((data as AuditEvent[]) ?? []))
  }, [])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <GlassCard className="p-5">
        <div className="space-y-4">
          {events.map((e) => (
            <div key={e.id} className="flex gap-3 border-b border-black/5 pb-4 last:border-0 last:pb-0">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--emerald-500)]" />
              <div>
                <p className="text-sm text-slate-700">{e.description}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {e.actor?.full_name ?? 'System'} · {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-slate-500">No audit events yet.</p>}
        </div>
      </GlassCard>
    </div>
  )
}
