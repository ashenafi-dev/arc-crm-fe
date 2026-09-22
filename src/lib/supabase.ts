import { createClient } from '@supabase/supabase-js'

// Anon/publishable key — safe to ship client-side by design. Falls back to
// these literals so the demo works even without Vercel env vars configured.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://hmdrsrqlvdzzsozxaokq.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hIiKvXWUkUlwFYV7jrypAA_J9-uRNfy'

export const supabase = createClient(url, anonKey)
