import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { rentalsApi } from '../api/rentals.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function RentalsPage() {
  const query = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })

  if (query.isLoading) return <LoadingState label="Loading rentals…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load rentals">{query.error.message}</Alert>

  const rentals = unwrap(query.data)

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div><Title order={2}>Rentals</Title><Text c="dimmed">Instrument and band-room reservations with payment balances.</Text></div>
        <Button>New rental</Button>
      </Group>
      {!rentals.length ? <Alert color="gray" title="No rentals">Create an instrument or band-room rental to see it here.</Alert> : (
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          {rentals.map((rental) => (
            <Card key={rental.id} withBorder>
              <Stack gap="sm">
                <Group justify="space-between"><Title order={4}>{rental.rentalType}</Title><Badge>{rental.status}</Badge></Group>
                <Text size="sm">Customer: {rental.customerUserId}</Text>
                <Text size="sm">Schedule: {new Date(rental.scheduledStart).toLocaleString()} – {new Date(rental.scheduledEnd).toLocaleString()}</Text>
                <Text size="sm">Resource: {rental.resourceId}</Text>
                <Text fw={600}>Total: ₱{Number(rental.totalAmount).toLocaleString()}</Text>
                <Text size="sm">Required down payment: ₱{Number(rental.requiredDownPayment).toLocaleString()}</Text>
                <Text size="sm">Payment obligation: {rental.paymentObligationId ?? 'Pending creation'}</Text>
                <Button variant="light">Open rental</Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
