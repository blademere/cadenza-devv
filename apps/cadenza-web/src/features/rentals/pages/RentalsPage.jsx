import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, NumberInput, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function RentalsPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const [payment, setPayment] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const action = useMutation({
    mutationFn: ({ type, id }) => rentalsApi[type](id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }),
  })
  const pay = useMutation({
    mutationFn: ({ id, amount: value }) => paymentsApi.pay(id, { amount: String(value), currency: 'PHP', method }),
    onSuccess: () => { setPayment(null); setAmount(''); client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) },
  })
  const checkout = useMutation({
    mutationFn: (rental) => paymentsApi.checkout(rental.paymentObligationId, { amount: String(rental.requiredDownPayment), description: 'Cadenza rental online payment' }),
  })
  if (query.isLoading) return <LoadingState label="Loading rentals…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load rentals">{query.error.message}</Alert>
  const rentals = unwrap(query.data)
  const run = (type, id) => action.mutate({ type, id })
  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Rentals</Title><Text c="dimmed">Instrument and band-room reservations with payment balances.</Text></div></Group>
    {(action.error || pay.error || checkout.error) && <Alert color="red" title="Rental operation failed">{(action.error || pay.error || checkout.error).message}</Alert>}
    {!rentals.length ? <Alert color="gray" title="No rentals">Create an instrument or band-room rental through the booking workflow.</Alert> :
      <SimpleGrid cols={{ base: 1, md: 2 }}>{rentals.map((rental) =>
        <Card key={rental.id} withBorder><Stack gap="sm">
          <Group justify="space-between"><Title order={4}>{rental.rentalType}</Title><Badge>{rental.status}</Badge></Group>
          <Text size="sm">Customer: {rental.customerUserId}</Text>
          <Text size="sm">Schedule: {new Date(rental.scheduledStart).toLocaleString()} – {new Date(rental.scheduledEnd).toLocaleString()}</Text>
          <Text size="sm">Resource: {rental.resourceId}</Text>
          <Text fw={600}>Total: ₱{Number(rental.totalAmount).toLocaleString()}</Text>
          <Text size="sm">Down payment: ₱{Number(rental.requiredDownPayment).toLocaleString()}</Text>
          <Group>
            {rental.paymentObligationId && <Button variant="light" onClick={() => { setPayment(rental); setAmount(rental.requiredDownPayment) }}>Record payment</Button>}
            {rental.paymentObligationId && rental.status === 'PENDING' && <Button variant="light" loading={checkout.isPending} onClick={() => checkout.mutate(rental)}>Online checkout</Button>}
            {rental.status === 'RESERVED' && <Button loading={action.isPending} onClick={() => run('checkout', rental.id)}>Check out</Button>}
            {rental.status === 'CHECKED_OUT' && <Button loading={action.isPending} onClick={() => run('returnRental', rental.id)}>Return</Button>}
            {['PENDING', 'RESERVED'].includes(rental.status) && <Button color="red" variant="subtle" loading={action.isPending} onClick={() => run('cancel', rental.id)}>Cancel</Button>}
          </Group>
        </Stack></Card>
      )}</SimpleGrid>}
    <Modal opened={Boolean(payment)} onClose={() => setPayment(null)} title="Record rental payment">
      <Stack>
        <Text size="sm">Payment obligation: {payment?.paymentObligationId}</Text>
        <NumberInput label="Amount" min={0.01} value={amount} onChange={setAmount} />
        <TextInput label="Method" value={method} onChange={(e) => setMethod(e.currentTarget.value)} />
        <Button loading={pay.isPending} disabled={!amount || !payment?.paymentObligationId} onClick={() => pay.mutate({ id: payment.paymentObligationId, amount })}>Record payment</Button>
      </Stack>
    </Modal>
  </Stack>
}
