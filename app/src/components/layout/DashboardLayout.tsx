import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PageTransition } from './PageTransition'

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 pl-0">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
