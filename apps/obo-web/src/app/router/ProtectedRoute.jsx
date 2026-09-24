import { Navigate } from 'react-router-dom'
import { Box } from '@mantine/core'
import LoadingState from '../../components/common/LoadingState'
import { useAuth } from '../../features/auth/components/AuthProvider'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Box className="route-loading">
        <LoadingState label="Checking your session…" rows={3} />
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}
