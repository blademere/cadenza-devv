import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import LoadingState from '../components/common/LoadingState'
import { apiClient } from '../services/api/client'

const dashboardApi = { get: () => apiClient.get('/cadenza/dashboard') }
const unwrap = (response) => response?.data ?? response ?? {}

export default function DashboardPage() {
  const query = useQuery({ queryKey: ['cadenza', 'dashboard'], queryFn: dashboardApi.get })
  if (query.isLoading) return <LoadingState label="Loading Cadenza dashboard…" rows={4} />
  if (query.error) return <Alert color="red" title="Unable to load dashboard">{query.error.message}</Alert>
  const data = unwrap(query.data)
  const cards = [
    ['Today’s sessions', data.today?.sessions ?? 0],
    ['Outstanding payments', data.outstandingPayments ?? 0],
    ['Open rentals', data.openRentals ?? 0],
    ['Pending enrollments', data.pendingEnrollments ?? data.attendancePending ?? 0],
  ]
  return <Stack gap="lg">
    <div><Text className="cadenza-eyebrow">Workspace</Text><Title order={1}>Dashboard</Title><Text c="dimmed">Role-aware Cadenza operations at a glance.</Text></div>
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
      {cards.map(([label, value]) => <Card key={label} withBorder><Text size="sm" c="dimmed">{label}</Text><Text fw={700} size="xl">{value}</Text></Card>)}
    </SimpleGrid>
    <Card withBorder><Group justify="space-between"><div><Title order={4}>Current workload</Title><Text size="sm" c="dimmed">The dashboard is filtered by the authenticated Cadenza role.</Text></div><Badge>{(data.assignedSessions ?? data.todaysSessions ?? data.enrollments ?? []).length}</Badge></Group></Card>
  </Stack>
}
