import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const resources = [
  { name: 'Room 1', type: 'Band room', status: 'Available' },
  { name: 'Room 2', type: 'Lesson room', status: 'In use' },
  { name: 'Acoustic Guitar A', type: 'Instrument', status: 'Available' },
]

export default function ResourcesPage() {
  return <Stack gap="lg">
    <div><Title order={2}>Resources</Title><Text c="dimmed">Manage Cadenza-owned instruments and rooms.</Text></div>
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{resources.map(r => <Card key={r.name} withBorder><Stack gap="xs"><Group justify="space-between"><Title order={4}>{r.name}</Title><Badge variant="light">{r.status}</Badge></Group><Text c="dimmed">{r.type}</Text></Stack></Card>)}</SimpleGrid>
  </Stack>
}
