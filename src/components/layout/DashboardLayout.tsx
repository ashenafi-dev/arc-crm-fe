import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageTransition } from './PageTransition'

export function DashboardLayout() {
  return (
    <div className="relative min-h-screen w-full">
      <Sidebar />
      <div className="relative z-10 flex min-h-screen flex-col md:pl-[18rem]">
        <div className="flex-1 px-4 pt-4 pb-8 sm:px-6">
          <Topbar />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
    </div>
  )
}
