import { useEffect, useState } from 'react'
import toast, { type Toast as HotToast } from 'react-hot-toast'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react'

export type ToastLevel = 'success' | 'error' | 'warning' | 'info'

const LEVELS: Record<ToastLevel, { icon: LucideIcon; bg: string; border: string; tint: string; color: string; label: string }> = {
  success: { icon: CheckCircle2, bg: '#ecf7f1', border: '#bfe5d0', tint: '#d3efdf', color: '#1e8c66', label: 'Success' },
  error: { icon: XCircle, bg: '#fdeeea', border: '#f6c9bd', tint: '#fad9d0', color: '#d63a1f', label: 'Error' },
  warning: { icon: AlertTriangle, bg: '#fdf5dc', border: '#f1dc9a', tint: '#f9e8b3', color: '#b7791f', label: 'Warning' },
  info: { icon: Info, bg: '#f3f1ee', border: '#e2ddd6', tint: '#e6e1da', color: '#181412', label: 'Notice' },
}

export const TOAST_DURATION = 10_000

const RING_R = 15
const RING_C = 2 * Math.PI * RING_R

export function Toast({ t, level, message }: { t: HotToast; level: ToastLevel; message: string }) {
  const s = LEVELS[level]
  const Icon = s.icon
  const [remaining, setRemaining] = useState(TOAST_DURATION)
  const [hovered, setHovered] = useState(false)

  // Own countdown so hovering pauses just this toast
  useEffect(() => {
    if (hovered || !t.visible) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      setRemaining((r) => Math.max(0, r - (now - last)))
      last = now
    }, 100)
    return () => window.clearInterval(id)
  }, [hovered, t.visible])

  useEffect(() => {
    if (remaining <= 0) toast.dismiss(t.id)
  }, [remaining, t.id])

  const seconds = Math.ceil(remaining / 1000)

  return (
    <div
      role={level === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        'pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border p-3 font-[Onest,Inter,sans-serif] shadow-[0_12px_32px_-12px_rgba(24,20,18,0.28)]',
        t.visible ? 'toast-enter' : 'toast-leave',
      )}
      style={{ background: s.bg, borderColor: s.border }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: s.tint, color: s.color }}>
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: s.color }}>{s.label}</p>
        <p className="text-sm leading-snug font-medium text-[#181412]">{message}</p>
      </div>

      {/* Countdown ring: seconds left, turns into a close button on hover */}
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        aria-label={`Dismiss (closes in ${seconds}s)`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5"
        style={{ color: s.color }}
      >
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r={RING_R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
          <circle
            cx="18"
            cy="18"
            r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - remaining / TOAST_DURATION)}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        {hovered ? (
          <X size={15} strokeWidth={2.5} className="count-tick text-[#181412]" />
        ) : (
          <span key={seconds} className="count-tick text-xs font-bold tabular-nums">
            {seconds}
          </span>
        )}
      </button>
    </div>
  )
}
