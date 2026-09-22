import { useQueries } from '@tanstack/react-query'
import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { resourcesApi } from '../api/resources.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function ResourcesPage() {
  const results = useQueries({
    queries: [
      { queryKey: ['cadenza', 'instruments'], queryFn: resourcesApi.listInstruments },
      { queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms },
    ],
  })

  if (results.some((result) => result.isLoading)) return <LoadingState label="Loading Cadenza resources…" rows={3} />
  const error = results.find((result) => result.error)?.error
  if (error) return <Alert color="red" title="Unable to load resources">{error.message}</Alert>

  const instruments = unwrap(results[0].data)
  const rooms = unwrap(results[1].data)
  const resources = [
    ...instruments.map((item) => ({ ...item, resourceType: 'Instrument', label: item.instrumentType })),
    ...rooms.map((item) => ({ ...item, resourceType: 'Room', label: item.roomType })),
  ]

  return (
    <Stack gap="lg">
      <div><Title order={2}>Resources</Title><Text c="dimmed">Manage Cadenza-owned instruments and rooms.</Text></div>
      {!resources.length ? <Alert color="gray" title="No resources">Add an instrument or room to make it available for Cadenza operations.</Alert> : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {resources.map((resource) => (
            <Card key={resource.id} withBorder>
              <Stack gap="xs">
                <Group justify="space-between"><Title order={4}>{resource.label}</Title><Badge variant="light">{resource.status}</Badge></Group>
                <Text c="dimmed">{resource.resourceType}</Text>
                <Text size="sm">Resource ID: {resource.resourceId}</Text>
                <Text size="sm">Rate: ₱{Number(resource.rentalRate).toLocaleString()}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
