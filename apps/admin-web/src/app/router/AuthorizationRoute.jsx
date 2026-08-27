import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { useAuthorization } from '../../features/authorization/AuthorizationProvider'

export default function AuthorizationRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, isLoading: authorizationLoading } = useAuthorization()

  if (isLoading || authorizationLoading) {
    return (
      <Center mih="50vh">
        <Stack align="center" gap="sm">
          <Loader size="sm" />
          <Text c="dimmed">Checking authorization…</Text>
        </Stack>
      </Center>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!can('authorization:manage')) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
