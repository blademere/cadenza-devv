import { Navigate } from 'react-router-dom'
import { Box, Skeleton, Stack } from '@mantine/core'
import { useAuth } from '../../features/auth/AuthProvider'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Box className="route-loading">
        <Stack w="min(360px, 100%)" gap="md">
          <Skeleton height={12} width="38%" radius="xl" />
          <Skeleton height={34} radius="md" />
          <Skeleton height={14} width="72%" radius="xl" />
          <Skeleton height={90} radius="lg" mt="md" />
        </Stack>
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}
