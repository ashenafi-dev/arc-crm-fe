import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  strong?: boolean
}

export function GlassCard({ children, strong, className, ...rest }: GlassCardProps) {
  return (
    <div
      className={clsx(
        strong ? 'glass-strong' : 'glass',
        'rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
