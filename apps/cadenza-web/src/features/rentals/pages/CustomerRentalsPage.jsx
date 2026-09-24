import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import SelectField from '../../../components/select-field'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { resourcesApi } from '../../resources/api/resources.api'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (value) => value?.data ?? value ?? []
const resourceName = (item, type) => item?.resource?.name || item?.name || item?.instrumentType || item?.roomType || (type === 'ROOM' ? 'Band room' : 'Instrument')
const resourceDescription = (item, type) => type === 'ROOM'
  ? [item?.roomType, item?.capacity ? `Up to ${item.capacity} people` : null].filter(Boolean).join(' · ')
  : [item?.instrumentType, item?.brand, item?.model].filter(Boolean).join(' · ')

export default function CustomerRentalsPage() {
  const client = useQueryClient()
  const [type, setType] = useState('INSTRUMENT')
  const [selectedResource, setSelectedResource] = useState(null)
  const [selectedRentalId, setSelectedRentalId] = useState(null)
  const [form, setForm] = useState({ resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })

  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const instruments = useQuery({ queryKey: ['cadenza', 'customer', 'instruments'], queryFn: resourcesApi.listInstruments })
  const rooms = useQuery({ queryKey: ['cadenza', 'customer', 'rooms'], queryFn: resourcesApi.listRooms })
  const selected = useQuery({ queryKey: ['cadenza', 'rental', selectedRentalId], queryFn: () => rentalsApi.get(selectedRentalId), enabled: Boolean(selectedRentalId) })
  const payment = useQuery({ queryKey: ['cadenza', 'rental-payment', selectedRentalId], queryFn: () => paymentsApi.get(unwrap(selected.data)?.paymentObligationId), enabled: Boolean(unwrap(selected.data)?.paymentObligationId) })
  const history = useQuery({ queryKey: ['cadenza', 'rental-payment-history', selectedRentalId], queryFn: () => paymentsApi.history(unwrap(selected.data).paymentObligationId), enabled: Boolean(unwrap(selected.data)?.paymentObligationId) })
  const availability = useQuery({
    queryKey: ['cadenza', 'customer', 'rental-availability', type, form.scheduledStart, form.scheduledEnd],
    queryFn: () => rentalsApi.availability({ rentalType: type, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() }),
    enabled: Boolean(form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd),
  })
  const create = useMutation({
    mutationFn: rentalsApi.create,
    onSuccess: (response) => {
      setSelectedResource(null)
      setForm({ resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })
      client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      const value = unwrap(response)
      if (value?.id) setSelectedRentalId(value.id)
    },
  })
  const checkout = useMutation({
    mutationFn: ({ obligationId, amount }) => paymentsApi.checkout(obligationId, { amount: String(amount), description: 'Cadenza rental payment' }),
    onSuccess: (response) => { const value = unwrap(response); if (value?.checkoutUrl) window.location.assign(value.checkoutUrl) },
  })
  const cancel = useMutation({
    mutationFn: rentalsApi.cancel,
    onSuccess: () => { client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }); client.invalidateQueries({ queryKey: ['cadenza', 'rental', selectedRentalId] }) },
  })

  const catalog = type === 'ROOM' ? unwrap(rooms.data) : unwrap(instruments.data)
  const availableIds = useMemo(() => new Set(unwrap(availability.data).map((entry) => entry?.resource?.id ?? entry?.domain?.resourceId).filter(Boolean)), [availability.data])
  const available = availability.isSuccess ? catalog.filter((item) => availableIds.has(item.resourceId ?? item.id)) : catalog
  const selectedRental = unwrap(selected.data)
  const obligation = unwrap(payment.data)
  const balance = Number(obligation?.balanceDue ?? selectedRental?.totalAmount ?? 0)
  const durationHours = form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd ? (new Date(form.scheduledEnd) - new Date(form.scheduledStart)) / 3600000 : 0
  const rate = Number(selectedResource?.rentalRate ?? 0)
  const total = durationHours > 0 && rate > 0 ? durationHours * rate : 0
  const error = rentals.error || instruments.error || rooms.error || availability.error || create.error || selected.error || payment.error || history.error || checkout.error || cancel.error

  if (rentals.isLoading || instruments.isLoading || rooms.isLoading) return <LoadingState label="Loading rental options…" rows={5} />
  if (error && !selectedRental) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>

  const openBooking = (resource = null) => {
    const resourceId = resource ? (resource.resourceId ?? resource.id) : ''
    setSelectedResource(resource)
    setForm({ resourceId, scheduledStart: '', scheduledEnd: '', requiredDownPayment: resource?.requiredDownPayment ?? '' })
  }

  const submit = () => create.mutate({
    customerId: undefined,
    resourceId: form.resourceId,
    rentalType: type,
    scheduledStart: new Date(form.scheduledStart).toISOString(),
    scheduledEnd: new Date(form.scheduledEnd).toISOString(),
    requiredDownPayment: String(form.requiredDownPayment),
    currency: 'PHP',
  })

  return (
    <div className="space-y-6">
      <PageHeader title="My Rentals" description="Book instruments and band rooms, manage your bookings, and keep track of rental payments." />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Book a resource</h2><p className="text-sm text-muted-foreground">Choose a resource first, then select your rental time and booking deposit.</p></div><div className="flex gap-2"><Button variant={type === 'INSTRUMENT' ? 'default' : 'outline'} onClick={() => { setType('INSTRUMENT'); setSelectedResource(null) }}>Instruments</Button><Button variant={type === 'ROOM' ? 'default' : 'outline'} onClick={() => { setType('ROOM'); setSelectedResource(null) }}>Band rooms</Button></div></div>
        {available.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No {type === 'ROOM' ? 'band rooms' : 'instruments'} are available.</CardContent></Card> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{available.map((item) => <Card key={item.resourceId ?? item.id} className="flex h-full flex-col"><CardHeader><CardTitle className="text-base">{resourceName(item, type)}</CardTitle><p className="text-sm text-muted-foreground">{resourceDescription(item, type) || 'Cadenza rental resource'}</p></CardHeader><CardContent className="mt-auto flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Rate</p><p className="font-semibold">{formatCurrency(item.rentalRate)} / hour</p></div><Button onClick={() => openBooking(item)}>Rent this</Button></CardContent></Card>)}</div>}
      </section>

      <section className="space-y-4"><div><h2 className="text-lg font-semibold">My bookings</h2><p className="text-sm text-muted-foreground">Open a rental to view its schedule, payment balance, and payment history.</p></div>{unwrap(rentals.data).length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">You have no rental bookings yet.</CardContent></Card> : <div className="grid gap-3">{unwrap(rentals.data).map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.resource?.name ?? (item.rentalType === 'ROOM' ? 'Band room' : 'Instrument')}</p><Badge variant="secondary">{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{new Date(item.scheduledStart).toLocaleString()} – {new Date(item.scheduledEnd).toLocaleString()}</p></div><Button size="sm" variant="outline" onClick={() => setSelectedRentalId(item.id)}>View rental</Button></CardContent></Card>)}</div>}</section>

      <Dialog open={Boolean(selectedResource)} onOpenChange={(open) => !open && setSelectedResource(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Book {resourceName(selectedResource, type)}</DialogTitle><DialogDescription>Review the rental window, total, and required booking deposit.</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm((v) => ({ ...v, scheduledStart: e.currentTarget.value, resourceId: form.resourceId }))} /></div><div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm((v) => ({ ...v, scheduledEnd: e.currentTarget.value, resourceId: form.resourceId }))} /></div></div><SelectField label="Available resource" options={available.map((item) => ({ value: item.resourceId ?? item.id, label: resourceName(item, type) }))} value={form.resourceId} onChange={(value) => { const item = available.find((row) => (row.resourceId ?? row.id) === value); setForm((v) => ({ ...v, resourceId: value })); if (item) setSelectedResource(item) }} /><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Booking deposit</Label><Input type="number" min="0.01" step="0.01" value={form.requiredDownPayment} onChange={(e) => setForm((v) => ({ ...v, requiredDownPayment: e.currentTarget.value }))}/><p className="text-xs text-muted-foreground">Deposit is due at booking. The remaining balance is paid when the rental is used.</p></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Estimated total</p><p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p><p className="text-xs text-muted-foreground">{durationHours ? `${durationHours.toFixed(2)} hours × ${formatCurrency(rate)}/hour` : 'Choose a valid rental window.'}</p></div></div></div><DialogFooter><Button variant="outline" onClick={() => setSelectedResource(null)}>Cancel</Button><Button disabled={create.isPending || !form.resourceId || !form.scheduledStart || !form.scheduledEnd || form.scheduledStart >= form.scheduledEnd || !form.requiredDownPayment || Number(form.requiredDownPayment) <= 0 || (total > 0 && Number(form.requiredDownPayment) > total) || (availability.isSuccess && !availableIds.has(form.resourceId))} onClick={submit}>{create.isPending ? 'Booking…' : 'Confirm booking'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(selectedRentalId)} onOpenChange={(open) => !open && setSelectedRentalId(null)}><DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[1100px]"><DialogHeader className="shrink-0 border-b px-6 py-5 pr-14"><DialogTitle>Rental details</DialogTitle><DialogDescription>{selectedRental ? `${selectedRental.resource?.name ?? 'Rental'} · ${selectedRental.status}` : 'Loading rental…'}</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto p-6">{selected.isLoading ? <LoadingState label="Loading rental…" rows={3} /> : selectedRental ? <div className="grid gap-6"><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Booking details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{selectedRental.status}</Badge></div><div className="flex justify-between"><span className="text-muted-foreground">Resource</span><span>{selectedRental.resource?.name ?? selectedRental.resourceId}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Start</span><span>{new Date(selectedRental.scheduledStart).toLocaleString()}</span></div><div className="flex justify-between"><span className="text-muted-foreground">End</span><span>{new Date(selectedRental.scheduledEnd).toLocaleString()}</span></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Payment summary</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><div className="flex justify-between"><span>Total</span><span>{formatCurrency(obligation?.totalAmount ?? selectedRental.totalAmount)}</span></div><div className="flex justify-between"><span>Deposit</span><span>{formatCurrency(selectedRental.requiredDownPayment)}</span></div><div className="flex justify-between font-semibold"><span>Balance</span><span>{formatCurrency(balance)}</span></div>{balance > 0 && selectedRental.status !== 'CANCELLED' && <Button onClick={() => checkout.mutate({ obligationId: selectedRental.paymentObligationId, amount: selectedRental.status === 'PENDING' ? selectedRental.requiredDownPayment : balance })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : 'Pay online'}</Button>}</CardContent></Card></div><Card><CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader><CardContent className="space-y-2">{history.isLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : unwrap(history.data).length ? unwrap(history.data).map((entry) => <div key={entry.id} className="flex justify-between border-b py-2 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</CardContent></Card>{['PENDING','RESERVED'].includes(selectedRental.status) && <Button variant="outline" className="w-fit" onClick={() => cancel.mutate(selectedRental.id)} disabled={cancel.isPending || Number(obligation?.netPaidAmount ?? obligation?.paidAmount ?? 0) > 0}>{cancel.isPending ? 'Cancelling…' : 'Cancel booking'}</Button>}</div> : <p className="text-sm text-muted-foreground">Rental not found.</p>}</div></DialogContent></Dialog>
    </div>
  )
}
