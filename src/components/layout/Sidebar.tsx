import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, ChevronRight, History, LayoutGrid, LogOut, ShoppingCart, Truck, Users, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui'
import { notify } from '@/lib/notify'
import { ROLE_LABELS, type Profile, type RequestStatus, type Role } from '@/types'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid, roles: null },
  { to: '/requests', label: 'Purchase Requests', icon: ShoppingCart, roles: null },
  { to: '/labor', label: 'Labor Requests', icon: Users, roles: null },
  { to: '/vendors', label: 'Vendors', icon: Truck, roles: ['admin', 'owner', 'finance'] },
  { to: '/audit', label: 'Audit Log', icon: History, roles: ['admin', 'owner'] },
]

// What each role gets nudged about in the sidebar card
const FOCUS: Record<Role, { status: RequestStatus | null; title: (n: number) => string; body: string; cta: string }> = {
  finance: { status: 'awaiting_finance', title: (n) => `${n} request${n === 1 ? ' needs' : 's need'} your review`, body: 'Check pricing and budget to keep them moving', cta: 'Review now' },
  general_manager: { status: 'awaiting_gm', title: (n) => `${n} request${n === 1 ? ' needs' : 's need'} your review`, body: 'Finance has cleared these for your sign-off', cta: 'Review now' },
  owner: { status: 'awaiting_owner', title: (n) => `${n} request${n === 1 ? '' : 's'} await final approval`, body: 'Finance and the GM have already signed off', cta: 'Review now' },
  admin: { status: 'approved', title: (n) => `${n} approved request${n === 1 ? '' : 's'} to purchase`, body: 'Record the purchase once it is paid', cta: 'Open list' },
  employee: { status: null, title: (n) => `${n} of your request${n === 1 ? ' is' : 's are'} in progress`, body: 'Follow each one through the approval chain', cta: 'Track them' },
}

const OPEN: RequestStatus[] = ['draft', 'quote_received', 'awaiting_finance', 'awaiting_gm', 'awaiting_owner', 'approved']

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <>
      <aside className="fixed top-4 bottom-4 left-4 z-30 hidden w-64 flex-col gap-3 md:flex">
        <SidebarPanel />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="modal-fade-in absolute inset-0 bg-[#181412]/55 backdrop-blur-[4px]" onClick={onClose} />
          <aside className="drawer-in absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col gap-3 p-3">
            <SidebarPanel onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}

function SidebarPanel({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth()
  const [team, setTeam] = useState<Profile[]>([])
  const [focusCount, setFocusCount] = useState(0)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .limit(6)
      .then(({ data }) => setTeam((data as Profile[]) ?? []))
  }, [])

  useEffect(() => {
    if (!profile) return
    const focus = FOCUS[profile.role]
    const base = supabase.from('purchase_requests').select('id', { count: 'exact', head: true })
    const query = focus.status ? base.eq('status', focus.status) : base.eq('requester_id', profile.id).in('status', OPEN)
    query.then(({ count }) => setFocusCount(count ?? 0))
  }, [profile])

  if (!profile) return null
  const focus = FOCUS[profile.role]

  return (
    <>
      <div className="panel-dark flex min-h-0 w-full flex-1 flex-col rounded-[1.75rem]">
        {/* Fixed: logo */}
        <div className="flex shrink-0 items-center gap-2.5 px-6 pt-6 pb-5">
          <Link to="/dashboard" onClick={onClose} className="focus-ring flex-1 rounded-lg">
            <img src="/brand/logo-light.png" alt="Arch Ops" className="h-6 w-auto" draggable={false} />
          </Link>
          {onClose && (
            <button onClick={onClose} aria-label="Close menu" className="focus-ring rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Scrollable: nav + team */}
        <div className="scroll-dark min-h-0 flex-1 overflow-y-auto px-4">
          <nav className="space-y-1">
            {NAV.filter((item) => !item.roles || item.roles.includes(profile.role)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <item.icon size={18} strokeWidth={1.6} className="shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="my-4 border-t border-white/10" />

          <div className="mb-3 flex items-center justify-between px-2">
            <p className="text-sm font-medium text-white">Team members</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70">
              <ChevronRight size={14} />
            </span>
          </div>
          <ul className="space-y-3 px-2 pb-4">
            {team.map((member, i) => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar initials={member.avatar_initials} index={i} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{member.full_name}</p>
                  <p className="truncate text-xs text-white/45">{ROLE_LABELS[member.role]}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Fixed: profile + sign out */}
        <div className="shrink-0 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-2.5 py-2">
            <Avatar initials={profile.avatar_initials} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{profile.full_name}</p>
              <p className="truncate text-xs text-white/45">{ROLE_LABELS[profile.role]}</p>
            </div>
            <button
              onClick={async () => {
                await signOut()
                notify.info('You have been signed out')
              }}
              title="Sign out"
              aria-label="Sign out"
              className="focus-ring rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Role focus card, sits under the menu like the reference */}
      <Link
        to={focusCount > 0 && focus.status ? `/requests?status=${focus.status}` : '/requests'}
        onClick={onClose}
        className="cta-card focus-ring group block shrink-0 rounded-[1.75rem] p-5 text-white"
      >
        <p className="text-xl leading-tight font-bold">{focusCount > 0 ? focus.title(focusCount) : 'You are all caught up'}</p>
        <p className="mt-1.5 text-xs text-white/75">{focusCount > 0 ? focus.body : 'Nothing is waiting on you right now'}</p>
        <span className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-white py-3 text-sm font-medium text-[var(--ink)]">
          {focusCount > 0 ? focus.cta : 'View requests'}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </>
  )
}
