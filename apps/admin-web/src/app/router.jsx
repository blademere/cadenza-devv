import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import AdminLayout from '../layouts/AdminLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import { useAuth } from '../features/auth/AuthProvider'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="route-loading">Loading your workspace…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
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
  { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
  { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
  { path: '*', element: <Navigate to="/" replace /> },
]}])
