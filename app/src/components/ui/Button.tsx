import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  loading?: boolean
}

export function Button({ children, variant = 'primary', loading, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' &&
          'bg-gradient-to-b from-[var(--gold-400)] to-[var(--gold-600)] text-[#241804] shadow-[0_4px_16px_rgba(232,163,61,0.35)] hover:brightness-105',
        variant === 'outline' && 'border border-white/15 text-slate-200 hover:bg-white/5',
        variant === 'ghost' && 'text-slate-300 hover:bg-white/5',
        variant === 'danger' && 'bg-[var(--status-red)]/90 text-white hover:brightness-105',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
