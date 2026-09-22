import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { lessonsApi } from '../features/lessons/api/lessons.api'
import { schedulingApi } from '../features/scheduling/api/scheduling.api'
import { rentalsApi } from '../features/rentals/api/rentals.api'
import LoadingState from '../components/common/LoadingState'

const unwrap = (response) => response?.data ?? response ?? []

export default function DashboardPage() {
  const lessons = useQuery({ queryKey: ['cadenza','dashboard','enrollments'], queryFn: lessonsApi.listEnrollments })
  const sessions = useQuery({ queryKey: ['cadenza','dashboard','sessions'], queryFn: schedulingApi.listSessions })
  const rentals = useQuery({ queryKey: ['cadenza','dashboard','rentals'], queryFn: rentalsApi.list })
  if (lessons.isLoading || sessions.isLoading || rentals.isLoading) return <LoadingState label="Loading Cadenza dashboard…" rows={4} />
  const error = lessons.error || sessions.error || rentals.error
  if (error) return <Alert color="red" title="Unable to load dashboard">{error.message}</Alert>
  const enrollments = unwrap(lessons.data), scheduled = unwrap(sessions.data), rentalRows = unwrap(rentals.data)
  const pendingEnrollments = enrollments.filter((x) => x.status === 'PENDING_PAYMENT').length
  const upcomingSessions = scheduled.filter((x) => x.status === 'SCHEDULED' && new Date(x.scheduledStart) >= new Date()).length
  const activeRentals = rentalRows.filter((x) => ['RESERVED','CHECKED_OUT'].includes(x.status)).length
  const pendingRentals = rentalRows.filter((x) => x.status === 'PENDING').length
  return <Stack gap="lg">
    <div><Text className="cadenza-eyebrow">Workspace</Text><Title order={1}>Dashboard</Title><Text c="dimmed">Your Cadenza operations at a glance.</Text></div>
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
      {[['Upcoming lessons',upcomingSessions],['Lesson payments pending',pendingEnrollments],['Active rentals',activeRentals],['Rental bookings pending',pendingRentals]].map(([label,value]) => <Card key={label} withBorder><Text size="sm" c="dimmed">{label}</Text><Text fw={700} size="xl">{value}</Text></Card>)}
    </SimpleGrid>
    <Card withBorder><Group justify="space-between"><div><Title order={4}>Upcoming sessions</Title><Text size="sm" c="dimmed">Your sessions visible under the current Cadenza authorization context.</Text></div><Badge>{upcomingSessions}</Badge></Group></Card>
  </Stack>
}
