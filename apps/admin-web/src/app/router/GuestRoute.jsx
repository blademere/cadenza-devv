import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'

export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="sm">
          <Loader size="sm" />
          <Text c="dimmed">Loading…</Text>
        </Stack>
      </Center>
    )
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}
