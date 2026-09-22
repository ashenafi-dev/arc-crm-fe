import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABELS } from '@/types'

const NAV = [
  { to: '/', label: 'Dashboard', icon: GridIcon, roles: null },
  { to: '/requests', label: 'Purchase Requests', icon: CartIcon, roles: null },
  { to: '/labor', label: 'Labor Requests', icon: UsersIcon, roles: null },
  { to: '/vendors', label: 'Vendors', icon: TruckIcon, roles: ['admin', 'owner', 'finance'] },
  { to: '/audit', label: 'Audit Log', icon: ClockIcon, roles: ['admin', 'owner'] },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  return (
    <aside className="glass-strong sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-64 flex-col rounded-2xl p-4">
      <div className="mb-8 flex items-center gap-2 px-2 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gold-400)] to-[var(--gold-600)] font-black text-[#241804]">
          E
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">ETHIX</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.filter((item) => !item.roles || item.roles.includes(profile.role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
            {profile.avatar_initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile.full_name}</p>
            <p className="truncate text-xs text-slate-400">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="focus-ring mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-red-300"
        >
          <LogoutIcon className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function CartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" />
      <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.6L20 7H5.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="8" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.6" /><path d="M14.5 14.3c2.5.2 4.7 2.4 4.7 5.7" strokeLinecap="round" />
    </svg>
  )
}
function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="1.5" y="6" width="12" height="10" rx="1.2" /><path d="M13.5 10h4l3.5 3.5V16h-7.5z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.8" /><circle cx="16.5" cy="18" r="1.8" />
    </svg>
  )
}
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
