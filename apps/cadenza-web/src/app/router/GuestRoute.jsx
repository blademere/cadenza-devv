import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/components/AuthProvider'

export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />

  return children
}
