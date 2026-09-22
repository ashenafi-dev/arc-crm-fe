import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AmbientBackground } from '@/components/layout/AmbientBackground'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { RequestList } from '@/pages/requests/RequestList'
import { RequestDetail } from '@/pages/requests/RequestDetail'
import { NewRequest } from '@/pages/requests/NewRequest'
import { LaborList } from '@/pages/labor/LaborList'
import { Vendors } from '@/pages/Vendors'
import { AuditLog } from '@/pages/AuditLog'

function App() {
  return (
    <AuthProvider>
      <AmbientBackground />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#14293bE6',
            color: '#e5edf3',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            fontSize: '13px',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: '#3fb87f', secondary: '#0f1f2e' } },
          error: { iconTheme: { primary: '#ef5a5a', secondary: '#0f1f2e' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/requests" element={<RequestList />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/labor" element={<LaborList />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/audit" element={<AuditLog />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
