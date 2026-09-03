import { Badge, Box, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import StatusChip from '../../../components/common/StatusChip'

const unwrap = (value) => value?.data ?? value
const itemsOf = (value) => {
  const data = unwrap(value)
  if (Array.isArray(data)) return data
  return data?.items ?? []
}
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—'

export default function PlanPermitApplicationList({ data }) {
  const applications = itemsOf(data)
  if (!applications.length) return <Box className="obo-panel" p="xl"><Text fw={650}>No permit applications</Text><Text size="sm" c="dimmed" mt={4}>There are no plan permit applications associated with your account.</Text></Box>

  return <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
    {applications.map((application) => (
      <Box key={application.id} className="obo-panel" p="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} truncate>{application.referenceNumber ?? application.id}</Text>
              <Text size="sm" c="dimmed" truncate>{application.permitType?.name ?? 'Plan Permit'}</Text>
            </Box>
            <StatusChip status={application.status} />
          </Group>
          <Group gap="xl">
            <Box><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box>
            <Box><Text size="xs" c="dimmed">Professional</Text><Text size="sm" truncate maw={180}>{application.professional?.name ?? application.professional?.email ?? '—'}</Text></Box>
          </Group>
          <Group justify="flex-end"><Button component={Link} to={`/app/applications/${application.id}`} variant="light" size="sm">View details</Button></Group>
        </Stack>
      </Box>
    ))}
  </SimpleGrid>
}
