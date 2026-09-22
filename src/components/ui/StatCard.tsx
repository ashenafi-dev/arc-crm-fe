import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  accent?: 'gold' | 'emerald' | 'green' | 'red'
}

const ACCENTS = {
  gold: 'var(--gold-500)',
  emerald: 'var(--emerald-500)',
  green: 'var(--status-green)',
  red: 'var(--status-red)',
}

export function StatCard({ label, value, prefix = '', suffix = '', accent = 'emerald' }: StatCardProps) {
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
    <div className="flex-1 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <span ref={ref} className="mt-1.5 block text-2xl font-bold" style={{ color: ACCENTS[accent] }}>
        {prefix}0{suffix}
      </span>
    </div>
  )
}
