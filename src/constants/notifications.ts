// Mock notifications until a real notifications table exists
export type NotificationKind = 'review' | 'approved' | 'rejected' | 'comment' | 'labor' | 'system'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  link: string
  created_at: string
  read: boolean
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', kind: 'review', title: 'Structural steel beams needs review', body: 'Sara Mekonnen submitted $185,000 for Riverside Office Renovation.', link: '/requests?status=awaiting_finance', created_at: minutesAgo(4), read: false },
  { id: 'n2', kind: 'approved', title: 'Finance approved Interior lighting fixtures', body: 'It is now waiting on the General Manager.', link: '/requests?status=awaiting_gm', created_at: minutesAgo(38), read: false },
  { id: 'n3', kind: 'labor', title: 'Plumbers crew moved to in progress', body: '3 workers are on site at City Center.', link: '/labor', created_at: minutesAgo(95), read: false },
  { id: 'n4', kind: 'comment', title: 'Helen Abebe left a comment', body: '“Can we get a second quote for the cladding?”', link: '/requests', created_at: minutesAgo(180), read: true },
  { id: 'n5', kind: 'rejected', title: 'Decorative stone cladding was rejected', body: 'Owner: over budget for this phase.', link: '/requests?status=rejected', created_at: minutesAgo(60 * 26), read: true },
  { id: 'n6', kind: 'system', title: 'Weekly spend summary is ready', body: '$166,600 approved across 4 requests this week.', link: '/dashboard', created_at: minutesAgo(60 * 50), read: true },
]
