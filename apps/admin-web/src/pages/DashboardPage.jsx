import { Link } from 'react-router-dom'
import { Alert, Badge, Box, Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

function StatCard({ label, value, hint, icon }) {
  return <Card className="admin-kpi" withBorder><Group justify="space-between" align="flex-start"><Text className="admin-kpi-label">{label}</Text><ThemeIcon size={30} radius="md" variant="light" color="indigo">{icon}</ThemeIcon></Group><Text className="admin-kpi-value">{value}</Text><Text className="admin-kpi-meta">{hint}</Text></Card>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { context, isLoading, error } = useAuthorization()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const permissions = context?.permissions ?? []
  const authorizationVisible = permissions.includes('authorization:manage')
  const usersVisible = permissions.includes('users:manage')
  const activeModules = (context?.modules ?? []).filter((module) => module.isActive !== false)
  const role = context?.role?.name ?? context?.role?.key ?? 'No role assigned'

  return <Stack className="admin-page">
    <PageHeader eyebrow="Overview" title={`Welcome back, ${name}`} description="A focused view of your administrative access, platform modules, and the actions available to you." />
    {error && <Alert color="red" variant="light" title="Unable to load access context">{error.message ?? String(error)}</Alert>}
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
      <StatCard label="Current role" value={role} hint="Assigned access profile" icon="R" />
      <StatCard label="Permissions" value={permissions.length} hint="Effective permissions" icon="P" />
      <StatCard label="Enabled modules" value={activeModules.length} hint="Currently available" icon="M" />
      <StatCard label="Access status" value={authorizationVisible || usersVisible ? 'Granted' : 'Restricted'} hint={isLoading ? 'Checking access…' : 'Server-authorized'} icon="✓" />
    </SimpleGrid>
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      <Card className="admin-panel" withBorder p={0}>
        <Box className="admin-panel-header"><Box><Text className="admin-panel-title">Authorization center</Text><Text className="admin-panel-subtitle">Manage roles and access policies</Text></Box><Badge color={authorizationVisible ? 'green' : 'gray'} variant="light">{authorizationVisible ? 'Available' : 'Restricted'}</Badge></Box>
        <Stack p="lg" gap="md"><Text size="sm" c="dimmed" lh={1.7}>Permissions are resolved by the server and applied to the current account. Changes take effect through the authorization system.</Text><Group>{authorizationVisible && <Button component={Link} to="/roles">Manage roles</Button>}{usersVisible && <Button component={Link} to="/users" variant="light">Manage users</Button>}</Group>{!authorizationVisible && !usersVisible && <Text size="sm" c="dimmed">Your account does not currently have authorization-management access.</Text>}</Stack>
      </Card>
      <Card className="admin-panel" withBorder p={0}>
        <Box className="admin-panel-header"><Box><Text className="admin-panel-title">Workspace status</Text><Text className="admin-panel-subtitle">Current platform context</Text></Box><ThemeIcon size={30} radius="xl" color="green" variant="light">✓</ThemeIcon></Box>
        <Stack p="lg" gap="sm"><Group justify="space-between"><Text size="sm" c="dimmed">Signed-in account</Text><Text size="sm" fw={600}>{user?.email || '—'}</Text></Group><Group justify="space-between"><Text size="sm" c="dimmed">Role</Text><Text size="sm" fw={600}>{role}</Text></Group><Group justify="space-between"><Text size="sm" c="dimmed">Modules</Text><Text size="sm" fw={600}>{activeModules.length} enabled</Text></Group><Group justify="space-between"><Text size="sm" c="dimmed">Authorization</Text><Badge color={authorizationVisible || usersVisible ? 'green' : 'gray'} variant="light">{authorizationVisible || usersVisible ? 'Authorized' : 'Restricted'}</Badge></Group></Stack>
      </Card>
    </SimpleGrid>
    {(authorizationVisible || usersVisible) && <Box className="admin-action-panel"><Group justify="space-between" align="center" wrap="wrap"><Box style={{ minWidth: 0, flex: 1 }}><Text className="admin-action-title">Keep access intentional</Text><Text className="admin-action-text">Review role permissions regularly and grant only the capabilities required for each administrative responsibility.</Text></Box>{authorizationVisible && <Button component={Link} to="/roles" variant="white" color="dark">Review roles</Button>}</Group></Box>}
  </Stack>
}
