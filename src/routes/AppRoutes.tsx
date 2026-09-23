import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Home,
  Login,
  Dashboard,
  RequestList,
  RequestDetail,
  LaborList,
  Vendors,
  AuditLog,
} from '@/pages'

export function AppRoutes() {
  return (
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
        <Route path="/requests/new" element={<Navigate to="/requests?new=request" replace />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/labor" element={<LaborList />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/audit" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
