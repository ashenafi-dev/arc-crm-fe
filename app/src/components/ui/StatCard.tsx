import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  accent?: 'gold' | 'blue' | 'green' | 'red'
  icon?: React.ReactNode
}

const ACCENTS = {
  gold: 'var(--gold-500)',
  blue: 'var(--status-blue)',
  green: 'var(--status-green)',
  red: 'var(--status-red)',
}

export function StatCard({ label, value, prefix = '', suffix = '', accent = 'gold', icon }: StatCardProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const counter = { val: 0 }
    gsap.to(counter, {
      val: value,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = prefix + Math.round(counter.val).toLocaleString() + suffix
      },
    })
  }, [value, prefix, suffix])

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${ACCENTS[accent]}1a`, color: ACCENTS[accent] }}
          >
            {icon}
          </div>
        )}
      </div>
      <span ref={ref} className="mt-2 block text-2xl font-bold text-white">
        {prefix}0{suffix}
      </span>
    </GlassCard>
  )
}
