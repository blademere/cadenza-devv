import { Box, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import StatusChip from '../../../components/common/StatusChip'

const unwrap = (value) => value?.data ?? value
const itemsOf = (value) => {
  const data = unwrap(value)
  if (Array.isArray(data)) return data
  return data?.items ?? []
}
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—'
const snapshotCount = (application) => {
  const snapshots = application?.professionalSnapshots
  if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) return 0
  return Object.values(snapshots).reduce((count, value) => count + (Array.isArray(value) ? value.length : value ? 1 : 0), 0)
}

export default function PlanPermitApplicationList({ data }) {
  const applications = itemsOf(data)
  if (!applications.length) return <Box className="obo-panel" p="xl"><Text fw={650}>No permit applications</Text><Text size="sm" c="dimmed" mt={4}>There are no plan permit applications associated with your account.</Text></Box>
  return <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">{applications.map((application) => <Box key={application.id} className="obo-panel" p="lg"><Stack gap="sm"><Group justify="space-between" align="flex-start" wrap="nowrap"><Box style={{ minWidth: 0 }}><Text fw={700} truncate>{application.referenceNumber ?? application.id}</Text><Text size="sm" c="dimmed" truncate>{application.permitType?.name ?? 'Plan Permit'}</Text></Box><StatusChip status={application.status} /></Group><Group gap="xl"><Box><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box><Box><Text size="xs" c="dimmed">Selected professionals</Text><Text size="sm">{snapshotCount(application) || 'Not submitted'}</Text></Box></Group><Group justify="flex-end"><Button component={Link} to={`/app/applications/${application.id}`} variant="light" size="sm">View details</Button></Group></Stack></Box>)}</SimpleGrid>
}
