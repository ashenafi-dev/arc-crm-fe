import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'

export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
    )
  }, [location.pathname])

  return <div ref={ref}>{children}</div>
}
