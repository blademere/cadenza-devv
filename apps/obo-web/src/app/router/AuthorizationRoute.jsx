import { Navigate, Outlet } from 'react-router-dom'
import { Box, Skeleton, Stack } from '@mantine/core'
import { useAuth } from '../../features/auth/AuthProvider'
import { useAuthorization } from '../../features/authorization/AuthorizationProvider'
import { permissions } from '../../config/permissions'

export default function AuthorizationRoute({ requiredPermission = permissions.authorization.manage }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, isLoading: authorizationLoading } = useAuthorization()

  if (isLoading || authorizationLoading) {
    return (
      <Box className="route-loading">
        <Stack w="min(360px, 100%)" gap="md">
          <Skeleton height={12} width="42%" radius="xl" />
          <Skeleton height={34} radius="md" />
          <Skeleton height={80} radius="lg" />
        </Stack>
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredPermission && !can(requiredPermission)) return <Navigate to="/app/dashboard" replace />
  return <Outlet />
}
