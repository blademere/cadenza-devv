import { Box, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'

const unwrap = (value) => value?.data ?? value

export default function PermitTypeList({ data }) {
  const items = unwrap(data)
  const permitTypes = Array.isArray(items) ? items : items?.items ?? []
  if (!permitTypes.length) return <Box className="obo-panel" p="xl"><Text fw={650}>No permit types</Text><Text size="sm" c="dimmed" mt={4}>No active permit types are currently available.</Text></Box>
  return <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
    {permitTypes.map((permitType) => <Box key={permitType.id} className="obo-panel" p="lg"><Stack gap="sm"><Text fw={700}>{permitType.name ?? permitType.key ?? 'Permit type'}</Text><Text size="xs" c="dimmed">{permitType.key ?? permitType.code ?? '—'}</Text><Text size="sm" c="dimmed" lineClamp={3}>{permitType.description ?? 'No description provided.'}</Text><Group justify="flex-end"><Button component={Link} to={`/app/permit-types/${permitType.id}`} size="sm" variant="light">View details</Button></Group></Stack></Box>)}
  </SimpleGrid>
}
