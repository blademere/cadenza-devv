import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import AdminLayout from '../layouts/AdminLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import AuthorizationPage from '../pages/AuthorizationPage'
import ReceivingPage from '../pages/ReceivingPage'
import VerificationPage from '../pages/VerificationPage'
import ProfessionalsPage from '../pages/ProfessionalsPage'
import PermitTypesPage from '../pages/PermitTypesPage'
import CapabilityPage from '../pages/CapabilityPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="route-loading">Loading your workspace…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AuthorizationRoute({ permission, children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, isLoading: authorizationLoading } = useAuthorization()
  if (isLoading || authorizationLoading) return <div className="route-loading">Checking authorization…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (permission && !can(permission)) return <Navigate to="/dashboard" replace />
  return children
}

function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="route-loading">Loading…</div>
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

export const router = createBrowserRouter([{ path: '/', element: <App />, children: [
  { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
  { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
  { path: 'dashboard', element: <ProtectedRoute><AdminLayout /></ProtectedRoute>, children: [{ index: true, element: <DashboardPage /> }] },
  { path: 'authorization', element: <AuthorizationRoute permission="authorization:manage"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <AuthorizationPage /> }] },
  { path: 'receiving', element: <AuthorizationRoute permission="obo_plan_permits:receive"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <ReceivingPage /> }] },
  { path: 'professionals/verification', element: <AuthorizationRoute permission="obo_professionals:review"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <VerificationPage /> }] },
  { path: 'applications', element: <AuthorizationRoute permission="obo_plan_permits:read"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <CapabilityPage /> }] },
  { path: 'appointments', element: <AuthorizationRoute permission="appointments:read"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <CapabilityPage /> }] },
  { path: 'professionals', element: <AuthorizationRoute permission="obo_professionals:read"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <ProfessionalsPage /> }] },
  { path: 'permit-types', element: <AuthorizationRoute permission="obo_plan_permits:read"><AdminLayout /></AuthorizationRoute>, children: [{ index: true, element: <PermitTypesPage /> }] },
  { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
  { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
  { path: '*', element: <Navigate to="/" replace /> },
]}])
