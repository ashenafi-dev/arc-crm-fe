import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABELS } from '@/types'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'Purchase Requests',
  '/requests/new': 'New Purchase Request',
  '/labor': 'Labor Requests',
  '/vendors': 'Vendors',
  '/audit': 'Audit Log',
}

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/requests/')) return 'Request Details'
  return 'Arch Operations'
}

export function Topbar() {
  const { profile } = useAuth()
  const location = useLocation()
  if (!profile) return null

  return (
    <header className="glass-strong sticky top-4 z-20 mb-5 flex h-16 items-center justify-between rounded-3xl px-5">
      <div>
        <h1 className="text-lg font-semibold text-[var(--ink)]">{titleFor(location.pathname)}</h1>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{ROLE_LABELS[profile.role]} workspace</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="focus-ring relative rounded-full p-2 text-slate-500 transition-colors hover:bg-black/[0.04] hover:text-[var(--ink)]">
          <Bell size={18} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-red)' }} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--emerald-400)] to-[var(--emerald-600)] text-xs font-bold text-white">
            {profile.avatar_initials}
          </div>
          <span className="hidden text-sm font-medium text-[var(--ink)] sm:block">{profile.full_name}</span>
        </div>
      </div>
    </header>
  )
}
