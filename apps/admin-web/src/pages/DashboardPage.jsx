import { Link } from 'react-router-dom'
import { Alert, Badge, Box, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

const Stat = ({ label, value }) => <Card withBorder><Text size="sm" c="dimmed">{label}</Text><Title order={3} mt={4}>{value}</Title></Card>

export default function DashboardPage() {
  const { user } = useAuth()
  const { context, isLoading, error } = useAuthorization()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const authorizationVisible = (context?.navigation ?? []).some((item) => item.visible && item.key === 'authorization')
  const activeModules = (context?.modules ?? []).filter((module) => module.isActive !== false)
  const permissions = context?.permissions ?? []
  return <Stack gap="xl">
    <PageHeader eyebrow="Platform administration" title={`Welcome, ${name}`} description="Manage platform modules, roles, permissions, and administrative access." />
    {error && <Alert color="red">{error.message ?? String(error)}</Alert>}
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}><Stat label="Current role" value={context?.role?.name ?? context?.role?.key ?? '—'} /><Stat label="Permissions" value={permissions.length} /><Stat label="Enabled modules" value={activeModules.length} /><Stat label="Admin capability" value={authorizationVisible ? 'Granted' : 'Restricted'} /></SimpleGrid>
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start"><Box><Group gap="sm"><Title order={4}>Authorization center</Title>{authorizationVisible && <Badge color="green" variant="light">Available</Badge>}</Group><Text size="sm" c="dimmed" mt={4}>The server determines which administrative capabilities are available to you.</Text></Box>{isLoading && <Badge variant="light">Checking access</Badge>}</Group>
        {authorizationVisible ? <Button component={Link} to="/authorization" w="fit-content">Manage platform access</Button> : <Text size="sm" c="dimmed">Your account does not currently have authorization-management access.</Text>}
      </Stack>
    </Card>
  </Stack>
}
