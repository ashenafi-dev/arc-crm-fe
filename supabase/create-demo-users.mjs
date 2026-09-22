// One-shot script to create the 5 demo auth users via the Admin API.
// Needs the SERVICE ROLE key (Supabase Studio > Settings > API > service_role)
// - never commit that key, never expose it client-side, just paste it below
// to run this once and remove it again.
//
// Usage: node supabase/create-demo-users.mjs

const SUPABASE_URL = 'https://hmdrsrqlvdzzsozxaokq.supabase.co'
const SERVICE_ROLE_KEY = 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE'
const PASSWORD = 'Demo!2026'

const emails = [
  'employee@demo.ethix.io',
  'finance@demo.ethix.io',
  'gm@demo.ethix.io',
  'owner@demo.ethix.io',
  'admin@demo.ethix.io',
]

for (const email of emails) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
    }),
  })
  const data = await res.json()
  console.log(email, res.status, res.ok ? 'created' : data.msg ?? data)
}
