import { Badge, Box, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { IdentificationCard } from '@phosphor-icons/react'
import EmptyState from '../../../components/common/EmptyState'
import LoadingState from '../../../components/common/LoadingState'

const professionalName = (professional) => {
  const person = professional?.person ?? professional
  return [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || professional?.name || 'Professional'
}

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—')

export default function ProfessionalList({ professionals = [], isLoading = false, error = null, emptyTitle = 'No verified professionals', emptyDescription = 'Verified professionals will appear here.' }) {
  if (isLoading) return <LoadingState label="Loading professionals…" />
  if (error) return <Box className="obo-panel" p="lg"><Text c="red">{error.message ?? 'Unable to load professionals.'}</Text></Box>
  if (professionals.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return <Stack gap="md">
    {professionals.map((professional) => <Box key={professional.id} className="obo-panel" p="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group align="flex-start" gap="md">
          <IdentificationCard size={28} aria-hidden />
          <Stack gap={4}>
            <Text fw={700}>{professionalName(professional)}</Text>
            <Text size="sm" c="dimmed">Registration: {professional.registrationNumber ?? '—'}</Text>
          </Stack>
        </Group>
        <Badge variant="light">{professional.status ?? 'VERIFIED'}</Badge>
      </Group>
      <Divider my="md" />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Box><Text size="xs" c="dimmed">PRC ID</Text><Text size="sm" fw={600}>{professional.prcId ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">PTR</Text><Text size="sm" fw={600}>{professional.ptrNumber ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Verified</Text><Text size="sm" fw={600}>{formatDate(professional.verifiedAt)}</Text></Box>
      </SimpleGrid>
    </Box>)}
  </Stack>
}
