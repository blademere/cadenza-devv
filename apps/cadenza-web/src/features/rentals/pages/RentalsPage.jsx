import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { studentsApi } from '../../students/api/students.api'
import { resourcesApi }
import { useAuthorization } from '../../../features/authorization/components/AuthorizationProvider' from '../../resources/api/resources.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function RentalsPage() {\n  const { can } = useAuthorization()\n  const canCreateRental = can('cadenza_rentals:create')\n  const canManageRental = can('cadenza_rentals:manage')\n  const canCreatePayment = can('cadenza_payments:create')
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const students = useQuery({ queryKey: ['cadenza', 'students'], queryFn: studentsApi.list })
  const instruments = useQuery({ queryKey: ['cadenza', 'instruments'], queryFn: resourcesApi.listInstruments })
  const rooms = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms })
  const [payment, setPayment] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [createOpened, setCreateOpened] = useState(false)
  const [form, setForm] = useState({ customerUserId: '', resourceId: null, rentalType: 'INSTRUMENT', scheduledStart: '', scheduledEnd: '', totalAmount: '', requiredDownPayment: '', currency: 'PHP' })
  const action = useMutation({ mutationFn: ({ type, id }) => rentalsApi[type](id), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) })
  const create = useMutation({ mutationFn: rentalsApi.create, onSuccess: () => { setCreateOpened(false); client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) } })
  const pay = useMutation({ mutationFn: ({ id, amount: value }) => paymentsApi.pay(id, { amount: String(value), currency: 'PHP', method }), onSuccess: () => { setPayment(null); client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) } })
  const checkout = useMutation({ mutationFn: (rental) => paymentsApi.checkout(rental.paymentObligationId, { amount: String(rental.requiredDownPayment), description: 'Cadenza rental online payment' }), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) })
  const detail = useQuery({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId], queryFn: () => paymentsApi.get(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  if (query.isLoading) return <LoadingState label="Loading rentals…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load rentals">{query.error.message}</Alert>
  const rentals = unwrap(query.data)
  const studentData = unwrap(students.data)
  const resourceData = form.rentalType === 'INSTRUMENT' ? unwrap(instruments.data) : unwrap(rooms.data)
  const run = (type, id) => action.mutate({ type, id })
  const submit = () => create.mutate({ ...form, customerUserId: Number(form.customerUserId), scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString(), totalAmount: String(form.totalAmount), requiredDownPayment: String(form.requiredDownPayment) })
  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Rentals</Title><Text c="dimmed">Instrument and band-room reservations with down-payment and balance tracking.</Text></div>{canCreateRental && <Button onClick={() => setCreateOpened(true)}>Book rental</Button>}</Group>
    {(action.error || pay.error || checkout.error || create.error) && <Alert color="red" title="Rental operation failed">{(action.error || pay.error || checkout.error || create.error).message}</Alert>}
    {!rentals.length ? <Alert color="gray" title="No rentals">Book an instrument or band-room rental.</Alert> :
      <SimpleGrid cols={{ base: 1, md: 2 }}>{rentals.map((rental) =>
        <Card key={rental.id} withBorder><Stack gap="sm">
          <Group justify="space-between"><Title order={4}>{rental.rentalType}</Title><Badge>{rental.status}</Badge></Group>
          <Text size="sm">Customer: {rental.customerUserId}</Text>
          <Text size="sm">Schedule: {new Date(rental.scheduledStart).toLocaleString()} – {new Date(rental.scheduledEnd).toLocaleString()}</Text>
          <Text size="sm">Resource: {rental.resourceId}</Text>
          <Text fw={600}>Total: ₱{Number(rental.totalAmount).toLocaleString()}</Text>
          <Text size="sm">Down payment: ₱{Number(rental.requiredDownPayment).toLocaleString()}</Text>
          <Group>
            {rental.paymentObligationId && canCreatePayment && <Button variant="light" onClick={() => { setPayment(rental); setAmount(rental.requiredDownPayment) }}>Payment details</Button>}
            {rental.paymentObligationId && rental.status === 'PENDING' && canCreatePayment && <Button variant="light" loading={checkout.isPending} onClick={() => checkout.mutate(rental)}>Online checkout</Button>}
            {rental.status === 'RESERVED' && canManageRental && <Button loading={action.isPending} onClick={() => run('checkout', rental.id)}>Check out</Button>}
            {rental.status === 'CHECKED_OUT' && canManageRental && <Button loading={action.isPending} onClick={() => run('returnRental', rental.id)}>Return</Button>}
            {['PENDING', 'RESERVED'].includes(rental.status) && canManageRental && <Button color="red" variant="subtle" loading={action.isPending} onClick={() => run('cancel', rental.id)}>Cancel</Button>}
          </Group>
        </Stack></Card>
      )}</SimpleGrid>}
    <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Book rental"><Stack>
      <Select label="Customer" data={studentData.map((s) => { const id=s.person?.userId ?? s.userId; return { value: String(id ?? ''), label: s.person?.name ?? s.person?.fullName ?? s.personId ?? s.id } }).filter((x) => x.value)} value={form.customerUserId} onChange={(value) => setForm({ ...form, customerUserId: value })} />
      <Select label="Rental type" data={[{ value: 'INSTRUMENT', label: 'Instrument' }, { value: 'ROOM', label: 'Band room' }]} value={form.rentalType} onChange={(value) => setForm({ ...form, rentalType: value || 'INSTRUMENT', resourceId: null })} />
      <Select label={form.rentalType === 'INSTRUMENT' ? 'Instrument' : 'Band room'} data={resourceData.map((r) => ({ value: r.resourceId, label: r.instrumentType ?? r.roomType ?? r.resourceId }))} value={form.resourceId} onChange={(value) => setForm({ ...form, resourceId: value })} />
      <TextInput label="Start" type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.currentTarget.value })} />
      <TextInput label="End" type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.currentTarget.value })} />
      <NumberInput label="Total amount" min={0.01} value={form.totalAmount} onChange={(value) => setForm({ ...form, totalAmount: value })} />
      <NumberInput label="Required down payment" min={0.01} value={form.requiredDownPayment} onChange={(value) => setForm({ ...form, requiredDownPayment: value })} />
      <Button loading={create.isPending} disabled={!form.customerUserId || !form.resourceId || !form.scheduledStart || !form.scheduledEnd || !form.totalAmount || !form.requiredDownPayment} onClick={submit}>Book rental</Button>
    </Stack></Modal>
    <Modal opened={Boolean(payment)} onClose={() => setPayment(null)} title="Rental payment"><Stack>
      {detail.isLoading ? <Text>Loading payment balance…</Text> : detail.error ? <Alert color="red">{detail.error.message}</Alert> : <><Text>Obligation: {payment?.paymentObligationId}</Text><Text>Amount paid: ₱{Number(detail.data?.paidAmount ?? detail.data?.data?.paidAmount ?? 0).toLocaleString()}</Text><Text>Remaining: ₱{Number(detail.data?.remainingAmount ?? detail.data?.data?.remainingAmount ?? 0).toLocaleString()}</Text></>}
      <NumberInput label="Manual payment amount" min={0.01} value={amount} onChange={setAmount} /><TextInput label="Method" value={method} onChange={(e) => setMethod(e.currentTarget.value)} />
      <Button loading={pay.isPending} disabled={!amount || !payment?.paymentObligationId} onClick={() => pay.mutate({ id: payment.paymentObligationId, amount })}>Record payment</Button>
    </Stack></Modal>
  </Stack>
}
