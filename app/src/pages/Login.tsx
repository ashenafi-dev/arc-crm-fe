import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import gsap from 'gsap'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'

const DEMO_ACCOUNTS = [
  { role: 'Employee', email: 'employee@demo.ethix.io' },
  { role: 'Finance', email: 'finance@demo.ethix.io' },
  { role: 'General Manager', email: 'gm@demo.ethix.io' },
  { role: 'Owner', email: 'owner@demo.ethix.io' },
  { role: 'Admin', email: 'admin@demo.ethix.io' },
]

export function Login() {
  const { signIn, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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

  if (profile) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Welcome back')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div ref={cardRef} className="w-full max-w-md">
      <GlassCard strong className="p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gold-400)] to-[var(--gold-600)] text-lg font-black text-[#241804]">
            E
          </div>
          <h1 className="text-xl font-bold">Ethix Operations</h1>
          <p className="mt-1 text-sm text-slate-400">Architecture Firm Procurement & Labor Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@demo.ethix.io"
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500"
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
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500"
            />
          </div>
          <Button type="submit" loading={loading} className="w-full justify-center">
            Sign in
          </Button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Demo accounts</p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => setEmail(acc.email)}
                className="focus-ring flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              >
                <span>{acc.role}</span>
                <span className="text-slate-500">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
      </div>
    </div>
  )
}
