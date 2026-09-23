import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppNotification } from '@/types'

const LIMIT = 50

// The signed-in user's notifications, kept live over Supabase Realtime.
// Rows are created by database triggers; the app only reads, marks read and deletes.
export function useNotifications(userId: string | undefined, onNew?: (n: AppNotification) => void) {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const onNewRef = useRef(onNew)

  useEffect(() => {
    onNewRef.current = onNew
  })

  useEffect(() => {
    if (!userId) return
    let active = true

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error('Error fetching notifications:', error)
        setItems((data as AppNotification[]) ?? [])
        setLoading(false)
      })

    // Unique topic per mount so StrictMode's double effect never reuses a closed channel
    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as AppNotification
          setItems((list) => (list.some((i) => i.id === n.id) ? list : [n, ...list].slice(0, LIMIT)))
          onNewRef.current?.(n)
        } else if (payload.eventType === 'UPDATE') {
          const n = payload.new as AppNotification
          setItems((list) => list.map((i) => (i.id === n.id ? { ...i, ...n } : i)))
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as Partial<AppNotification>).id
          if (id) setItems((list) => list.filter((i) => i.id !== id))
        }
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markRead = useCallback(async (id: string) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) console.error('Error marking notification read:', error)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setItems((list) => list.map((n) => ({ ...n, is_read: true })))
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    if (error) console.error('Error marking notifications read:', error)
  }, [userId])

  const dismiss = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setItems((list) => list.filter((n) => !ids.includes(n.id)))
    const { error } = await supabase.from('notifications').delete().in('id', ids)
    if (error) console.error('Error deleting notifications:', error)
  }, [])

  // Signed out: nothing to show (the list is refilled on the next sign in)
  const visible = userId ? items : []
  const unread = visible.filter((n) => !n.is_read).length

  return { items: visible, loading: !!userId && loading, unread, markRead, markAllRead, dismiss }
}
