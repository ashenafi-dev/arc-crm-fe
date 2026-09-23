import { useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageTransition } from './PageTransition'
import { NewRequestModal } from '@/components/requests/NewRequestModal'
import { LaborRequestModal } from '@/components/labor/LaborRequestModal'

export function DashboardLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [navOpen, setNavOpen] = useState(false)
  const creating = searchParams.get('new')

  function closeCreate() {
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next)
  }

  return (
    <div className="app-shell relative z-10 min-h-screen w-full">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="relative flex min-h-screen flex-col md:pl-[17.5rem]">
        <div className="flex-1 px-4 pt-4 pb-8 sm:px-5">
          <Topbar onMenu={() => setNavOpen(true)} />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
      {creating === 'request' && <NewRequestModal onClose={closeCreate} />}
      {creating === 'labor' && <LaborRequestModal onClose={closeCreate} />}
    </div>
  )
}
