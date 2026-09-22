import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const rentals = [
  { item: 'Acoustic Guitar', customer: 'Customer', schedule: 'Today · 10:00–18:00', balance: '₱1,000', status: 'Booked' },
  { item: 'Band Room A', customer: 'Customer', schedule: 'Today · 19:00–21:00', balance: '₱500', status: 'Down payment paid' },
]

export default function RentalsPage() {
  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Rentals</Title><Text c="dimmed">Instrument and band-room reservations with payment balances.</Text></div><Button>New rental</Button></Group>
    <SimpleGrid cols={{ base: 1, md: 2 }}>{rentals.map(r => <Card key={r.item} withBorder><Stack gap="sm"><Group justify="space-between"><Title order={4}>{r.item}</Title><Badge>{r.status}</Badge></Group><Text size="sm">Customer: {r.customer}</Text><Text size="sm">Schedule: {r.schedule}</Text><Text fw={600}>Remaining balance: {r.balance}</Text><Button variant="light">Open rental</Button></Stack></Card>)}</SimpleGrid>
  </Stack>
}
