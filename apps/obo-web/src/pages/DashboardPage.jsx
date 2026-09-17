import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardText, FileText, UserCheck } from '@phosphor-icons/react'
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { useAuth } from '../features/auth/components/AuthProvider'
import { useCan } from '../features/authorization/useCan'
import { permissions } from '../config/permissions'
import { usePendingProfessionals } from '../features/professionals/queries/professionals.queries'
import { useReceivingApplications } from '../features/receiving/queries/receiving.queries'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'

const iconProps = { size: 22, weight: 'regular', 'aria-hidden': true }

function collection(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.data)) return value.data
  return []
}

function QueueCard({ title, description, count, loading, route, icon: Icon, actionLabel = 'Open queue' }) {
  return <Card className="obo-panel" withBorder><Stack gap="md"><Group justify="space-between" align="flex-start"><ThemeIcon size={42} radius="md" variant="light" color="indigo"><Icon {...iconProps} /></ThemeIcon><Badge variant="light" color={count > 0 ? 'orange' : 'green'}>{loading ? 'Loading' : count > 0 ? `${count} pending` : 'Clear'}</Badge></Group><BoxTitle title={title} description={description} /><Group justify="space-between" align="center" mt="xs"><Text size="sm" c="dimmed">{loading ? 'Checking queue…' : `${count} item${count === 1 ? '' : 's'} requiring attention`}</Text><Button component={Link} to={route} variant="subtle" rightSection={<ArrowRight size={16} aria-hidden />}>{actionLabel}</Button></Group></Stack></Card>
}

function BoxTitle({ title, description }) {
  return <Stack gap={4}><Title order={3} size="h4">{title}</Title><Text size="sm" c="dimmed" lh={1.6}>{description}</Text></Stack>
}

function StatCard({ label, value, description, icon: Icon }) {
  return <Card className="obo-kpi" withBorder><Group justify="space-between" align="flex-start"><Stack gap={2}><Text className="obo-kpi-label">{label}</Text><Text className="obo-kpi-value">{value}</Text><Text className="obo-kpi-meta">{description}</Text></Stack><ThemeIcon size={38} radius="md" variant="light" color="indigo"><Icon {...iconProps} /></ThemeIcon></Group></Card>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const can = useCan()
  const canReceive = can(permissions.planPermits.receive)
  const canReviewProfessionals = can(permissions.professionals.review)
  const scheduledQuery = useReceivingApplications('SUBMISSION_SCHEDULED', { enabled: canReceive })
  const receivingQuery = useReceivingApplications('RECEIVING', { enabled: canReceive })
  const inspectionQuery = useReceivingApplications('FOR_INSPECTION', { enabled: canReceive })
  const professionalsQuery = usePendingProfessionals({ enabled: canReviewProfessionals })
  const scheduled = collection(scheduledQuery.data).length
  const receiving = collection(receivingQuery.data).length
  const forInspection = collection(inspectionQuery.data).length
  const professionalReviews = collection(professionalsQuery.data).length
  const name = user?.name || user?.email?.split('@')[0] || 'User'
  const queryError = scheduledQuery.error || receivingQuery.error || inspectionQuery.error || professionalsQuery.error
  const loading = scheduledQuery.isLoading || receivingQuery.isLoading || inspectionQuery.isLoading || professionalsQuery.isLoading

  return <Stack className="obo-page" gap="xl">
    <PageHeader eyebrow="OBO Operations" title={`Welcome back, ${name}`} description="Use your OBO workspace to monitor permit workflow queues and complete the work assigned to your permissions." />
    {queryError && <Alert color="red" variant="light" title="Some dashboard data could not be loaded">{queryError.message ?? 'Refresh the dashboard and try again.'}</Alert>}
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
      <StatCard label="Submission scheduled" value={scheduledQuery.isLoading ? '—' : scheduled} description="Awaiting hard-copy receiving" icon={ClipboardText} />
      <StatCard label="Receiving" value={receivingQuery.isLoading ? '—' : receiving} description="Applications in receiving" icon={FileText} />
      <StatCard label="For inspection" value={inspectionQuery.isLoading ? '—' : forInspection} description="Accepted from receiving" icon={FileText} />
      <StatCard label="Professional reviews" value={professionalsQuery.isLoading ? '—' : professionalReviews} description="Verification decisions pending" icon={UserCheck} />
    </SimpleGrid>
    <Stack gap="md"><BoxTitle title="Work queues" description="Open the operational queue that matches your current responsibilities." />{loading && !queryError ? <Text size="sm" c="dimmed">Loading operational queues…</Text> : <SimpleGrid cols={{ base: 1, md: 2 }}>{canReceive && <QueueCard title="Plan Permit receiving" description="Receive scheduled hard-copy submissions and evaluate received permit applications, including those accepted for inspection." count={scheduled + receiving + forInspection} loading={scheduledQuery.isLoading || receivingQuery.isLoading || inspectionQuery.isLoading} route="/app/receiving" icon={ClipboardText} />}{canReviewProfessionals && <QueueCard title="Professional verification" description="Review registration details, PRC ID, and PTR submissions before verification." count={professionalReviews} loading={professionalsQuery.isLoading} route="/app/professionals/verification" icon={UserCheck} />}</SimpleGrid>}</Stack>
    {!loading && !queryError && canReceive && scheduled === 0 && receiving === 0 && forInspection === 0 && canReviewProfessionals && professionalReviews === 0 && <Card withBorder><EmptyState title="All operational queues are clear" description="There are no pending receiving, professional verification, or inspection handoff items requiring attention." /></Card>}
  </Stack>
}
