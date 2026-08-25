import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import AdminLayout from '../layouts/AdminLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import AuthorizationPage from '../pages/AuthorizationPage'
import UsersPage from '../pages/UsersPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="route-loading">Loading your workspace…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AuthorizationRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, isLoading: authorizationLoading } = useAuthorization()
  if (isLoading || authorizationLoading) return <div className="route-loading">Checking authorization…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!can('authorization:manage')) return <Navigate to="/dashboard" replace />
  return <AdminLayout>{children}</AdminLayout>
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
  { path: 'dashboard', element: <ProtectedRoute><AdminLayout><DashboardPage /></AdminLayout></ProtectedRoute> },
  { path: 'authorization', element: <AuthorizationRoute><AuthorizationPage /></AuthorizationRoute> },
  { path: 'authorization/users', element: <AuthorizationRoute><UsersPage /></AuthorizationRoute> },
  { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
  { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
  { path: '*', element: <Navigate to="/" replace /> },
]}])
