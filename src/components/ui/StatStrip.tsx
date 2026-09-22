import type { ReactNode } from 'react'
import { GlassCard } from './GlassCard'

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <GlassCard className="flex flex-col divide-y divide-black/[0.05] sm:flex-row sm:divide-x sm:divide-y-0">
      {children}
    </GlassCard>
  )
}
