import { Link } from 'react-router-dom'
import { Alert, Badge, Box, Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core'
import { useAuth } from '../features/auth/AuthProvider'
import { useCan } from '../features/authorization/useCan'
import { permissions } from '../config/permissions'
import { usePendingProfessionals } from '../features/professionals/professionals.queries'
import { useReceivingApplications } from '../features/receiving/queries/receiving.queries'
import PageHeader from '../components/common/PageHeader'

function StatCard({ label, value, hint, icon }) {
  return <Card className="obo-kpi" withBorder><Group justify="space-between" align="flex-start"><Text className="obo-kpi-label">{label}</Text><ThemeIcon size={30} radius="md" variant="light" color="indigo">{icon}</ThemeIcon></Group><Text className="obo-kpi-value">{value}</Text><Text className="obo-kpi-meta">{hint}</Text></Card>
}

function collectionSize(value) {
  if (Array.isArray(value)) return value.length
  if (Array.isArray(value?.items)) return value.items.length
  if (Array.isArray(value?.data)) return value.data.length
  return 0
}

function statusOf(application) {
  return application?.status || application?.workflowStatus || application?.currentStep?.key || application?.workflow?.currentStep?.key || null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const can = useCan()
  const canReceive = can(permissions.planPermits.receive)
  const canReviewProfessionals = can(permissions.professionals.review)
  const canManageAuthorization = can(permissions.authorization.manage) || can(permissions.users.manage)
  const receivingQuery = useReceivingApplications('SUBMISSION_SCHEDULED', { enabled: canReceive })
  const professionalsQuery = usePendingProfessionals({ enabled: canReviewProfessionals })
  const name = user?.name || user?.email?.split('@')[0] || 'User'
  const applications = receivingQuery.data
  const applicationItems = Array.isArray(applications) ? applications : applications?.items || applications?.data || []
  const scheduled = applicationItems.filter((application) => statusOf(application) === 'SUBMISSION_SCHEDULED').length
  const receiving = applicationItems.filter((application) => statusOf(application) === 'RECEIVING').length
  const forInspection = applicationItems.filter((application) => statusOf(application) === 'FOR_INSPECTION').length
  const professionalReviews = collectionSize(professionalsQuery.data)
  const hasOperationalData = canReceive || canReviewProfessionals
  const dataError = receivingQuery.error || professionalsQuery.error

  return <Stack className="obo-page">
    <PageHeader eyebrow="OBO Operations" title={`Welcome back, ${name}`} description="Monitor permit receiving work and professional verification from your OBO workspace." />

    {dataError && <Alert color="red" variant="light" title="Unable to load operational data">{dataError.message ?? String(dataError)}</Alert>}

    {!hasOperationalData && (
      <Alert color="gray" variant="light" title="No operational dashboard access">Your account does not currently have permission to view operational queues.</Alert>
    )}

    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
      <StatCard label="Submission scheduled" value={receivingQuery.isLoading ? '—' : scheduled} hint="Awaiting hard-copy receiving" icon="S" />
      <StatCard label="Receiving" value={receivingQuery.isLoading ? '—' : receiving} hint="Applications being received" icon="R" />
      <StatCard label="For inspection" value={receivingQuery.isLoading ? '—' : forInspection} hint="Accepted receiving phase" icon="I" />
      <StatCard label="Professional reviews" value={professionalsQuery.isLoading ? '—' : professionalReviews} hint="Pending verification" icon="P" />
    </SimpleGrid>

    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      {canReceive && (
        <Card className="obo-panel" withBorder p={0}>
          <Box className="obo-panel-header"><Box><Text className="obo-panel-title">Plan Permit receiving</Text><Text className="obo-panel-subtitle">Current hard-copy receiving workload</Text></Box><Badge color="green" variant="light">Available</Badge></Box>
          <Stack p="lg" gap="md"><Group justify="space-between"><Text size="sm" c="dimmed">Scheduled</Text><Text size="sm" fw={650}>{scheduled}</Text></Group><Group justify="space-between"><Text size="sm" c="dimmed">Receiving</Text><Text size="sm" fw={650}>{receiving}</Text></Group><Group justify="space-between"><Text size="sm" c="dimmed">For inspection</Text><Text size="sm" fw={650}>{forInspection}</Text></Group></Stack>
        </Card>
      )}

      {canReviewProfessionals && (
        <Card className="obo-panel" withBorder p={0}>
          <Box className="obo-panel-header"><Box><Text className="obo-panel-title">Professional verification</Text><Text className="obo-panel-subtitle">Current professional review workload</Text></Box><Badge color={professionalReviews ? 'orange' : 'green'} variant="light">{professionalReviews ? 'Action required' : 'Clear'}</Badge></Box>
          <Stack p="lg" gap="md"><Group justify="space-between"><Text size="sm" c="dimmed">Pending reviews</Text><Text size="sm" fw={650}>{professionalReviews}</Text></Group><Text size="sm" c="dimmed" lh={1.7}>Review professional registration details and record the verification decision in the corresponding operational workflow.</Text></Stack>
        </Card>
      )}
    </SimpleGrid>

    <Box className="obo-action-panel"><Group justify="space-between" align="center" wrap="wrap"><Box style={{ minWidth: 0, flex: 1 }}><Text className="obo-action-title">Operational workspace</Text><Text className="obo-action-text">Dashboard access is determined by your server-authorized permissions. Administration remains available separately when your role permits it.</Text></Box>{canManageAuthorization && <Button component={Link} to="/roles" variant="white" color="dark">Administration</Button>}</Group></Box>
  </Stack>
}
