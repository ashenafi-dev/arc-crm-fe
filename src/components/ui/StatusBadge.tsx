import { STATUS_COLORS, STATUS_LABELS, LABOR_STATUS_LABELS, type RequestStatus, type LaborStatus } from '@/types'

export function StatusBadge({ status }: { status: RequestStatus }) {
  const color = STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${color}1a`, color, border: `1px solid ${color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABELS[status]}
    </span>
  )
}

const LABOR_COLORS: Record<LaborStatus, string> = {
  requested: 'var(--status-draft)',
  reviewed: 'var(--status-amber)',
  assigned: 'var(--status-blue)',
  in_progress: 'var(--status-purple)',
  completed: 'var(--status-green)',
  cancelled: 'var(--status-red)',
}

export function LaborStatusBadge({ status }: { status: LaborStatus }) {
  const color = LABOR_COLORS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${color}1a`, color, border: `1px solid ${color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {LABOR_STATUS_LABELS[status]}
    </span>
  )
}
