import { Navigate } from 'react-router-dom'
import { CircularProgress, Stack, Typography } from '@mui/material'
import { useAuth } from '../../features/auth/AuthProvider'
import { useAuthorization } from '../../features/authorization/AuthorizationProvider'

export default function AuthorizationRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, isLoading: authorizationLoading } = useAuthorization()

  if (isLoading || authorizationLoading) {
    return <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}><CircularProgress size={28} /><Typography color="text.secondary">Checking authorization…</Typography></Stack>
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!can('authorization:manage')) return <Navigate to="/dashboard" replace />
  return children
}
