import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import gsap from 'gsap'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'

const DEMO_PASSWORD = 'Demo!2026'

const ROLES = [
  { label: 'Employee', email: 'employee@demo.ethix.io', initials: 'EM' },
  { label: 'Finance', email: 'finance@demo.ethix.io', initials: 'FI' },
  { label: 'General Manager', email: 'gm@demo.ethix.io', initials: 'GM' },
  { label: 'Owner', email: 'owner@demo.ethix.io', initials: 'OW' },
  { label: 'Admin', email: 'admin@demo.ethix.io', initials: 'AD' },
]

export function Login() {
  const { signIn, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickRole, setQuickRole] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' },
      )
    }
  }, [])

  if (profile) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) toast.error(error)
    else toast.success('Welcome back')
  }

  async function handleQuickLogin(roleEmail: string) {
    setQuickRole(roleEmail)
    const { error } = await signIn(roleEmail, DEMO_PASSWORD)
    setQuickRole(null)
    if (error) toast.error(error)
    else toast.success('Signed in')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div ref={cardRef} className="w-full max-w-md">
        <GlassCard strong className="p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--emerald-400)] to-[var(--emerald-600)] text-lg font-black text-[#241804]">
              A
            </div>
            <h1 className="text-xl font-bold">Arch Operations</h1>
            <p className="mt-1 text-sm text-slate-400">Architecture Firm Procurement & Labor Platform</p>
          </div>

          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Continue as
          </p>
          <div className="grid grid-cols-1 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => handleQuickLogin(r.email)}
                disabled={quickRole !== null}
                className="focus-ring group flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.025] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--emerald-500)]/40 hover:bg-black/[0.045] disabled:opacity-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.06] text-xs font-bold text-[var(--ink)] group-hover:bg-[var(--emerald-500)]/20 group-hover:text-[var(--emerald-500)]">
                  {r.initials}
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">{r.label}</span>
                {quickRole === r.email ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--emerald-500)] border-t-transparent" />
                ) : (
                  <span className="text-slate-500 transition-transform group-hover:translate-x-0.5">&rarr;</span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowManual((s) => !s)}
            className="focus-ring mt-5 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-600"
          >
            {showManual ? 'Hide manual sign in' : 'Sign in with email instead'}
          </button>

          {showManual && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-black/10 pt-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@demo.ethix.io"
                  className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="focus-ring w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-slate-500"
                />
              </div>
              <Button type="submit" loading={loading} className="w-full justify-center">
                Sign in
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
