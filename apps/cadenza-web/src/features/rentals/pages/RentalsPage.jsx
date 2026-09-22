import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { studentsApi } from '../../students/api/students.api'
import { resourcesApi } from '../../resources/api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (r) => r?.data ?? r ?? []

export default function RentalsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreate = can('cadenza_rentals:create')
  const canManage = can('cadenza_rentals:manage')
  const canPay = can('cadenza_payments:create')
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const students = useQuery({ queryKey: ['cadenza', 'students'], queryFn: studentsApi.list })
  const instruments = useQuery({ queryKey: ['cadenza', 'instruments'], queryFn: resourcesApi.listInstruments })
  const rooms = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms })
  const [open, setOpen] = useState(false)
  const [payment, setPayment] = useState(null)
  const [amount, setAmount] = useState('')
  const [form, setForm] = useState({ customerUserId: '', resourceId: null, rentalType: 'INSTRUMENT', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '', currency: 'PHP' })
  const availability = useQuery({ queryKey: ['cadenza', 'rental-availability', form.rentalType, form.scheduledStart, form.scheduledEnd], queryFn: () => rentalsApi.availability({ rentalType: form.rentalType, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() }), enabled: Boolean(form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd) })
  const create = useMutation({ mutationFn: rentalsApi.create, onSuccess: () => { setOpen(false); client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) } })
  const lifecycle = useMutation({ mutationFn: ({ type, id }) => rentalsApi[type](id), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) })
  const pay = useMutation({ mutationFn: ({ id, value }) => paymentsApi.pay(id, { amount: String(value), currency: 'PHP', method: 'CASH' }), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }) })
  const checkout = useMutation({ mutationFn: (rental) => paymentsApi.checkout(rental.paymentObligationId, { amount: String(rental.requiredDownPayment), description: 'Cadenza rental down payment' }), onSuccess: (response) => { const value = response?.data ?? response; if (value?.checkoutUrl) window.open(value.checkoutUrl, '_blank', 'noopener,noreferrer') } })
  const history = useQuery({ queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId], queryFn: () => paymentsApi.history(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  const detail = useQuery({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId], queryFn: () => paymentsApi.get(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  if (rentals.isLoading) return <LoadingState label="Loading rentals…" rows={4} />
  if (rentals.error) return <Alert color="red">{rentals.error.message}</Alert>
  const rows = unwrap(rentals.data)
  const resourceRows = availability.isSuccess ? unwrap(availability.data).map((entry) => entry.domain) : (form.rentalType === 'ROOM' ? unwrap(rooms.data) : unwrap(instruments.data))
  const studentRows = unwrap(students.data)
  const submit = () => create.mutate({ ...form, customerUserId: form.customerUserId ? Number(form.customerUserId) : undefined, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString(), requiredDownPayment: String(form.requiredDownPayment) })
  return <Stack gap="lg"><Group justify="space-between"><div><Title order={2}>Rentals</Title><Text c="dimmed">Scheduled instrument and band-room rentals with server-calculated pricing.</Text></div>{canCreate && <Button onClick={() => setOpen(true)}>Book rental</Button>}</Group>
    {(create.error || lifecycle.error || pay.error || checkout.error) && <Alert color="red">{(create.error || lifecycle.error || pay.error || checkout.error).message}</Alert>}
    <SimpleGrid cols={{ base: 1, md: 2 }}>{rows.map((r) => <Card key={r.id} withBorder><Stack><Group justify="space-between"><Title order={4}>{r.rentalType}</Title><Badge>{r.status}</Badge></Group><Text size="sm">{new Date(r.scheduledStart).toLocaleString()} – {new Date(r.scheduledEnd).toLocaleString()}</Text><Text fw={700}>Total: ₱{Number(r.totalAmount).toLocaleString()}</Text><Text size="sm">Down payment: ₱{Number(r.requiredDownPayment).toLocaleString()}</Text><Group>{r.paymentObligationId && canPay && <Button size="xs" onClick={() => { setPayment(r); setAmount(String(r.requiredDownPayment)) }}>Payment</Button>}{r.paymentObligationId && r.status === 'PENDING' && canPay && <Button size="xs" variant="light" onClick={() => checkout.mutate(r)}>Online checkout</Button>}{r.status === 'RESERVED' && canManage && <Button size="xs" onClick={() => lifecycle.mutate({ type: 'checkout', id: r.id })}>Check out</Button>}{r.status === 'CHECKED_OUT' && canManage && <Button size="xs" onClick={() => lifecycle.mutate({ type: 'returnRental', id: r.id })}>Return</Button>}{(r.status === 'PENDING' || r.status === 'RESERVED') && <Button size="xs" color="red" variant="subtle" onClick={() => lifecycle.mutate({ type: 'cancel', id: r.id })}>Cancel</Button>}</Group></Stack></Card>)}</SimpleGrid>
    <Modal opened={open} onClose={() => setOpen(false)} title="Book rental"><Stack>{canManage && <Select label="Customer" searchable clearable data={customerRows.map((u) => ({ value: String(u.id), label: u.email })).filter((x) => x.value)} value={form.customerUserId} onChange={(v) => setForm({ ...form, customerUserId: v ?? '' })} disabled={customers.isLoading} />}<Select label="Type" data={[{ value:'INSTRUMENT',label:'Instrument' },{ value:'ROOM',label:'Band room' }]} value={form.rentalType} onChange={(v) => setForm({ ...form, rentalType: v || 'INSTRUMENT', resourceId: null })} /><Select label="Resource" data={resourceRows.map((r) => ({ value:r.resourceId,label:r.instrumentType ?? r.roomType ?? r.resourceId }))} value={form.resourceId} onChange={(v) => setForm({ ...form, resourceId:v })} /><TextInput label="Start" type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart:e.currentTarget.value })} /><TextInput label="End" type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd:e.currentTarget.value })} /><NumberInput label="Required down payment" min={0.01} value={form.requiredDownPayment} onChange={(v) => setForm({ ...form, requiredDownPayment:v })} /><Text size="sm" c="dimmed">Available resources for the selected time are checked against existing rentals and lesson-room bookings. The server calculates the rental total from the resource hourly rate and booking duration.</Text><Button loading={create.isPending} disabled={!form.resourceId || !form.scheduledStart || !form.scheduledEnd || !form.requiredDownPayment} onClick={submit}>Book rental</Button></Stack></Modal>
    <Modal opened={Boolean(payment)} onClose={() => setPayment(null)} title="Rental payment"><Stack>{detail.isLoading ? <Text>Loading balance…</Text> : <><Text>Paid: ₱{Number(detail.data?.paidAmount ?? 0).toLocaleString()}</Text><Text>Balance: ₱{Number(detail.data?.balanceDue ?? 0).toLocaleString()}</Text></>}<NumberInput label="Manual payment" min={0.01} value={amount} onChange={setAmount} /><Button disabled={!amount || !payment} loading={pay.isPending} onClick={() => pay.mutate({ id: payment.paymentObligationId, value: amount })}>Record payment</Button>{history.isLoading ? <Text size="sm">Loading payment history…</Text> : <Stack gap="xs"><Text fw={600}>Payment history</Text>{(unwrap(history.data)).length ? unwrap(history.data).map((entry) => <Group key={entry.id} justify="space-between"><Text size="sm">{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</Text><Text size="sm">₱{Number(entry.amount ?? 0).toLocaleString()}</Text></Group>) : <Text size="sm" c="dimmed">No payments recorded.</Text>}</Stack>}</Stack></Modal>
  </Stack>
}
