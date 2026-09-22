import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Building2, ClipboardCheck, Compass, HardHat, TrendingUp } from 'lucide-react'

export function AmbientBackground() {
  const scope = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.blob-1', { x: 50, y: 35, duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.blob-2', { x: -40, y: 45, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.blob-3', { x: 30, y: -30, duration: 8.5, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.blob-4', { x: -35, y: -25, duration: 11, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.icon-glow', { y: -18, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 1.1 })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={scope} aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
      <div className="blob blob-1 -top-40 -left-32 h-96 w-96 opacity-25" style={{ background: 'var(--emerald-500)' }} />
      <div className="blob blob-2 top-32 -right-28 h-80 w-80 opacity-20" style={{ background: 'var(--emerald-500)' }} />
      <div className="blob blob-3 bottom-0 left-1/3 h-72 w-72 opacity-[0.16]" style={{ background: 'var(--teal-400)' }} />
      <div className="blob blob-4 -bottom-32 -right-24 h-80 w-80 opacity-20" style={{ background: 'var(--emerald-400)' }} />

      <div className="icon-glow fixed top-[10%] left-[16%] z-0 opacity-[0.06] blur-[2px]" style={{ color: 'var(--emerald-500)' }}>
        <Compass size={100} strokeWidth={0.6} />
      </div>
      <div className="icon-glow fixed top-[58%] left-[5%] z-0 opacity-[0.07] blur-[2px]" style={{ color: 'var(--emerald-400)' }}>
        <Building2 size={120} strokeWidth={0.6} />
      </div>
      <div className="icon-glow fixed top-[22%] right-[7%] z-0 opacity-[0.07] blur-[2px]" style={{ color: 'var(--teal-400)' }}>
        <ClipboardCheck size={100} strokeWidth={0.6} />
      </div>
      <div className="icon-glow fixed right-[12%] bottom-24 z-0 opacity-[0.08] blur-[2px]" style={{ color: 'var(--emerald-500)' }}>
        <HardHat size={110} strokeWidth={0.6} />
      </div>
      <div
        className="icon-glow fixed top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 opacity-[0.045] blur-[2px]"
        style={{ color: 'var(--emerald-400)' }}
      >
        <TrendingUp size={180} strokeWidth={0.6} />
      </div>
    </div>
  )
}
