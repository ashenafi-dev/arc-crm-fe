import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABELS } from '@/types'

const WORKFLOW = [
  'Request',
  'Quote',
  'Finance',
  'GM',
  'Owner',
  'Purchase',
  'Complete',
]

const ROLES: { role: keyof typeof ROLE_LABELS; blurb: string }[] = [
  { role: 'employee', blurb: 'Creates requests, attaches quotes, and tracks status from a single place instead of chasing messages.' },
  { role: 'finance', blurb: 'Reviews pricing and budget before anything moves forward — the first checkpoint on every spend.' },
  { role: 'general_manager', blurb: 'Confirms the work is operationally justified before it reaches final sign-off.' },
  { role: 'owner', blurb: 'Gives final approval where required and sees the full financial picture, company-wide.' },
  { role: 'admin', blurb: 'Manages users, projects, vendors, and the rules the whole workflow runs on.' },
]

export function Home() {
  const { profile } = useAuth()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
      <nav className="flex items-center justify-between py-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--emerald-400)] to-[var(--emerald-600)] text-sm font-black text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-wide text-[var(--ink)]">ARCH OPERATIONS</span>
        </div>
        <Link
          to={profile ? '/dashboard' : '/login'}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[var(--emerald-500)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--emerald-600)]"
        >
          {profile ? 'Go to dashboard' : 'Sign in'}
          <ArrowRight size={15} />
        </Link>
      </nav>

      <header className="py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--emerald-600)]">
          Architecture Firm Operations
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-[1.1] text-[var(--ink)] sm:text-5xl">
          Every purchase. Every approval.
          <br />
          One clear record.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-500">
          Ethix built this for the firm's procurement and labor workflow — replacing phone calls,
          screenshots, and scattered messages with one system that routes requests, tracks
          quotations, and gives management real visibility.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            to={profile ? '/dashboard' : '/login'}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--emerald-500)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--emerald-600)]"
          >
            {profile ? 'Go to dashboard' : 'Sign in to continue'}
            <ArrowRight size={16} />
          </Link>
          <span className="text-sm text-slate-400">No cost pilot · built with Supabase</span>
        </div>
      </header>

      <section className="border-t border-black/[0.06] py-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          The procurement workflow
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3">
          {WORKFLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="text-base font-semibold text-[var(--ink)]">{step}</span>
              {i < WORKFLOW.length - 1 && <ArrowRight size={16} className="text-[var(--emerald-500)]" />}
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-500">
          A request moves through Finance, the General Manager, and the Owner in order — each
          approval, rejection, and change captured automatically in an audit trail nobody can edit.
        </p>
      </section>

      <section className="border-t border-black/[0.06] py-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Built for every role</h2>
        <div className="mt-6 divide-y divide-black/[0.06]">
          {ROLES.map((r) => (
            <div key={r.role} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="shrink-0 text-sm font-semibold text-[var(--ink)] sm:w-44">
                {ROLE_LABELS[r.role]}
              </span>
              <span className="text-sm leading-relaxed text-slate-500">{r.blurb}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-black/[0.06] py-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What it replaces</h2>
        <ul className="mt-6 space-y-3">
          {[
            'Phone calls and scattered messages for every request',
            'Screenshots as the only record of a quotation or approval',
            'No visibility into what is pending, delayed, or spent',
            'Manual, error-prone follow-ups on every purchase',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-slate-500">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--emerald-500)]" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto flex items-center justify-between border-t border-black/[0.06] py-8 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Building2 size={14} />
          Arch Operations
        </span>
        <span>Built by Ethix</span>
      </footer>
    </div>
  )
}
