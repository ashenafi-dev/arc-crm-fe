import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Building2, FolderKanban, HardHat, Menu, Plus, Search, SlidersHorizontal, Store } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { NEW_DEPARTMENT_SEARCH, NEW_LABOR_SEARCH, NEW_PROJECT_SEARCH, NEW_REQUEST_SEARCH, NEW_VENDOR_SEARCH } from '@/constants'
import { useNotifications } from '@/hooks/useNotifications'
import { notify } from '@/lib/notify'
import { VENDOR_MANAGER_ROLES } from '@/services'
import type { Role } from '@/types'
import { NotificationsPanel } from './NotificationsPanel'

// The create button follows the page; restricted actions also respect the signed-in role.
function createActionFor(pathname: string, role: Role) {
  if (pathname.startsWith('/labor')) return { search: NEW_LABOR_SEARCH, label: 'Request labor', aria: 'New labor request', icon: HardHat }
  if (pathname.startsWith('/vendors') && VENDOR_MANAGER_ROLES.includes(role)) {
    return { search: NEW_VENDOR_SEARCH, label: 'Add vendor', aria: 'Add vendor', icon: Store }
  }
  if (pathname === '/admin/projects' && (role === 'admin' || role === 'owner')) {
    return { search: NEW_PROJECT_SEARCH, label: 'Add project', aria: 'Add project', icon: FolderKanban }
  }
  if (pathname === '/admin/departments' && (role === 'admin' || role === 'owner')) {
    return { search: NEW_DEPARTMENT_SEARCH, label: 'Add department', aria: 'Add department', icon: Building2 }
  }
  return { search: NEW_REQUEST_SEARCH, label: 'New request', aria: 'New purchase request', icon: Plus }
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  // A quiet heads-up when something new lands while the panel is closed
  const { items, unread, markRead, markAllRead, dismiss } = useNotifications(profile?.id, (n) => {
    if (!notifOpen) notify.info(n.title)
  })
  if (!profile) return null
  const create = createActionFor(pathname, profile.role)

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/requests?q=${encodeURIComponent(q)}` : '/requests')
  }

  return (
    <header className="sticky top-4 z-20 mb-5 flex items-center gap-2 sm:gap-3">
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className="focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-white sm:h-14 sm:w-14 md:hidden"
      >
        <Menu size={20} />
      </button>
      <form
        onSubmit={handleSearch}
        className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-[var(--card-border)] bg-white px-4 sm:h-14 sm:px-5 shadow-[0_1px_2px_rgba(24,20,18,0.03)]"
      >
        <Search size={20} strokeWidth={1.75} className="shrink-0 text-[var(--ink)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search requests, projects or request numbers…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-slate-400"
        />
        <Link to="/requests" title="Filters" className="focus-ring rounded-full p-1.5 text-[var(--ink-soft)] hover:bg-black/[0.04]">
          <SlidersHorizontal size={18} strokeWidth={1.75} />
        </Link>
      </form>

      <button
        onClick={() => setNotifOpen(true)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="focus-ring relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--card-border)] bg-white text-[var(--ink)] transition-colors hover:bg-[var(--canvas)] sm:h-14 sm:w-14"
      >
        <Bell size={20} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white ring-2 ring-[var(--canvas)]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <Link
        to={{ search: create.search }}
        aria-label={create.aria}
        className="focus-ring flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-semibold text-white transition-transform active:scale-[0.98] sm:h-14 sm:w-auto sm:bg-[var(--panel-dark)] sm:px-6"
      >
        <create.icon size={18} />
        <span className="hidden sm:inline">{create.label}</span>
      </Link>
      {notifOpen && (
        <NotificationsPanel
          items={items}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDismiss={dismiss}
          onClose={() => setNotifOpen(false)}
        />
      )}
    </header>
  )
}
