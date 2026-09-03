import { Navigate, Outlet } from 'react-router-dom'
import { Box, Skeleton, Stack } from '@mantine/core'
import { useAuth } from '../../features/auth/AuthProvider'

export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <Box className="route-loading">
        <Stack w="min(360px, 100%)" gap="md">
          <Skeleton height={38} width="42%" radius="md" />
          <Skeleton height={12} width="68%" radius="xl" />
          <Skeleton height={150} radius="lg" mt="md" />
          <Skeleton height={42} radius="md" />
        </Stack>
      </Box>
    )
  }
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />
  return children ?? <Outlet />
}
