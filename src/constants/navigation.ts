import type { Role } from '@/types'

export interface NavItem {
  to: string
  label: string
  roles: Role[] | null
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', roles: null },
  { to: '/requests', label: 'Purchase Requests', roles: null },
  { to: '/labor', label: 'Labor Requests', roles: null },
  { to: '/vendors', label: 'Vendors', roles: ['admin', 'owner', 'finance'] },
  { to: '/audit', label: 'Audit Log', roles: ['admin', 'owner'] },
]

// Any dashboard link to these searches opens the matching create modal over the current page
export const NEW_REQUEST_SEARCH = '?new=request'
export const NEW_LABOR_SEARCH = '?new=labor'

// Fired after a labor request is created so open lists can reload
export const LABOR_CREATED_EVENT = 'labor-request-created'
