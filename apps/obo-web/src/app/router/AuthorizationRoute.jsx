import { Navigate, Outlet } from 'react-router-dom'
import { Alert, Box, Stack } from '@mantine/core'
import LoadingState from '../../components/common/LoadingState'
import { useAuth } from '../../features/auth/components/AuthProvider'
import { useAuthorization } from '../../features/authorization/components/AuthorizationProvider'
import { permissions } from '../../config/permissions'

export default function AuthorizationRoute({
  requiredPermission = permissions.authorization.manage,
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, isLoading: authorizationLoading, error: authorizationError } = useAuthorization()

  if (isLoading || authorizationLoading) {
    return (
      <Box className="route-loading">
        <LoadingState label="Checking access permissions…" rows={3} />
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (authorizationError) {
    return (
      <Box className="route-loading" p="md">
        <Stack w="min(560px, 100%)">
          <Alert color="red" variant="light" title="Unable to verify access">
            Your permissions could not be verified. Refresh the page and try again.
          </Alert>
        </Stack>
      </Box>
    )
  }

  if (requiredPermission && !can(requiredPermission)) {
    return (
      <Box className="route-loading" p="md">
        <Stack w="min(560px, 100%)">
          <Alert color="yellow" variant="light" title="Access denied">
            You do not have permission to access this area.
          </Alert>
        </Stack>
      </Box>
    )
  }

  return <Outlet />
}
