import { Navigate } from 'react-router-dom'
import { CircularProgress, Stack, Typography } from '@mui/material'
import { useAuth } from '../../features/auth/AuthProvider'

export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}><CircularProgress size={28} /><Typography color="text.secondary">Loading…</Typography></Stack>
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}
