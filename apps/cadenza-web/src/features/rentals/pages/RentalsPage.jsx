import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import SelectField from '../../../components/select-field'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { resourcesApi } from '../../resources/api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []

const STATUS = [
  { value: 'ALL', label: 'All rentals' },
  { value: 'PENDING', label: 'Booking' },
  { value: 'RESERVED', label: 'Reserved / ready' },
  { value: 'CHECKED_OUT', label: 'Active rental' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const stageFor = (status) => ({
  PENDING: 'Booking',
  RESERVED: 'Reserved / Prepare',
  CHECKED_OUT: 'Active rental',
  RETURNED: 'Returned / Settled',
  CANCELLED: 'Cancelled',
}[status] || status)

const customerName = (customer) => {
  const person = customer?.person
  return (
    [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') ||
    person?.email ||
    customer?.id ||
    'Customer'
  )
}

const resourceTitle = (resource, rentalType) =>
  resource?.resource?.name ||
  resource?.name ||
  resource?.instrumentType ||
  resource?.roomType ||
  (rentalType === 'ROOM' ? 'Band room' : 'Instrument')

const resourceSubtitle = (resource, rentalType) => {
  if (rentalType === 'ROOM') {
    return [resource?.roomType, resource?.capacity ? `Up to ${resource.capacity} people` : null].filter(Boolean).join(' · ')
  }
  return [resource?.instrumentType, resource?.brand, resource?.model].filter(Boolean).join(' · ')
}

const workflowSteps = ['Booking', 'Reserved / Prepare', 'Active rental', 'Returned / Settled']

export default function RentalsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreate = can('cadenza_rentals:create')
  const canManage = can('cadenza_rentals:manage')
  const canPay = can('cadenza_payments:create')
  const customerView = canCreate && !canManage

  const [selectedId, setSelectedId] = useState(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingType, setBookingType] = useState('INSTRUMENT')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [amount, setAmount] = useState('')
  const [form, setForm] = useState({
    customerId: '',
    resourceId: '',
    rentalType: 'INSTRUMENT',
    scheduledStart: '',
    scheduledEnd: '',
    requiredDownPayment: '',
    currency: 'PHP',
  })

  const rentals = useQuery({
    queryKey: ['cadenza', 'rentals'],
    queryFn: rentalsApi.list,
  })

  const selected = useQuery({
    queryKey: ['cadenza', 'rental', selectedId],
    queryFn: () => rentalsApi.get(selectedId),
    enabled: Boolean(selectedId),
  })

  const selectedRental = unwrap(selected.data)

  const customers = useQuery({
    queryKey: ['cadenza', 'customers'],
    queryFn: rentalsApi.customers,
    enabled: canManage,
  })

  const instruments = useQuery({
    queryKey: ['cadenza', 'instruments'],
    queryFn: resourcesApi.listInstruments,
  })

  const rooms = useQuery({
    queryKey: ['cadenza', 'rooms'],
    queryFn: resourcesApi.listRooms,
  })

  const availability = useQuery({
    queryKey: ['cadenza', 'rental-availability', form.rentalType, form.scheduledStart, form.scheduledEnd],
    queryFn: () => rentalsApi.availability({
      rentalType: form.rentalType,
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
    }),
    enabled: Boolean(form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd),
  })

  const payment = useQuery({
    queryKey: ['cadenza', 'rental-payment', selectedId, selectedRental?.paymentObligationId],
    queryFn: () => paymentsApi.get(selectedRental.paymentObligationId),
    enabled: Boolean(selectedRental?.paymentObligationId),
  })

  const history = useQuery({
    queryKey: ['cadenza', 'rental-payment-history', selectedRental?.paymentObligationId],
    queryFn: () => paymentsApi.history(selectedRental.paymentObligationId),
    enabled: Boolean(selectedRental?.paymentObligationId),
  })

  const create = useMutation({
    mutationFn: rentalsApi.create,
    onSuccess: async (response) => {
      setBookingOpen(false)
      await client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      const value = unwrap(response)
      if (value?.id) setSelectedId(value.id)
    },
  })

  const lifecycle = useMutation({
    mutationFn: ({ type, id }) => rentalsApi[type](id),
    onSuccess: async (_, variables) => {
      await client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental', variables.id] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental-payment'] })
    },
  })

  const pay = useMutation({
    mutationFn: ({ id, value }) => paymentsApi.pay(id, {
      amount: String(value),
      currency: 'PHP',
      method: 'CASH',
    }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental', selectedId] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental-payment'] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental-payment-history'] })
      setAmount('')
    },
  })

  const checkoutOnline = useMutation({
    mutationFn: ({ obligationId, value }) => paymentsApi.checkout(obligationId, {
      amount: String(value),
      description: 'Cadenza rental payment',
    }),
    onSuccess: (response) => {
      const value = unwrap(response)
      if (value?.checkoutUrl) window.open(value.checkoutUrl, '_blank', 'noopener,noreferrer')
    },
  })

  const instrumentRows = unwrap(instruments.data)
  const roomRows = unwrap(rooms.data)
  const catalogRows = bookingType === 'ROOM' ? roomRows : instrumentRows
  const availabilityRows = availability.isSuccess ? unwrap(availability.data) : []
  const availableResourceIds = useMemo(
    () => new Set(
      availabilityRows
        .map((entry) => entry?.resource?.id ?? entry?.domain?.resourceId)
        .filter(Boolean),
    ),
    [availabilityRows],
  )
  const availableRows = availability.isSuccess
    ? catalogRows.filter((item) => availableResourceIds.has(item.resourceId ?? item.id))
    : catalogRows

  const resourceNameMap = useMemo(() => {
    const map = new Map()
    instrumentRows.forEach((item) => map.set(item.resourceId, item.resource?.name || item.instrumentType || item.resourceId))
    roomRows.forEach((item) => map.set(item.resourceId, item.resource?.name || item.roomType || item.resourceId))
    return map
  }, [instrumentRows, roomRows])

  const filteredCatalog = availableRows.filter((item) => {
    const term = catalogSearch.trim().toLowerCase()
    if (!term) return true
    return [
      item?.name,
      item?.instrumentType,
      item?.roomType,
      item?.brand,
      item?.model,
      item?.resource?.name,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
  })

  if (rentals.isLoading) return <LoadingState label="Loading rentals…" rows={5} />

  if (rentals.error) {
    return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>
  }

  const allRows = unwrap(rentals.data)
  const rows = allRows.filter((rental) => statusFilter === 'ALL' || rental.status === statusFilter)
  const customerRows = unwrap(customers.data)
  const obligation = selectedRental?.payment ?? unwrap(payment.data)
  const balanceDue = Number(obligation?.balanceDue ?? selectedRental?.totalAmount ?? 0)
  const onlineAmount = selectedRental?.status === 'PENDING'
    ? selectedRental?.requiredDownPayment
    : obligation?.balanceDue

  const detailError =
    selected.error ||
    payment.error ||
    history.error ||
    lifecycle.error ||
    pay.error ||
    checkoutOnline.error ||
    create.error

  const openBooking = (type = 'INSTRUMENT', resourceId = '') => {
    setBookingType(type)
    setForm({
      customerId: '',
      resourceId,
      rentalType: type,
      scheduledStart: '',
      scheduledEnd: '',
      requiredDownPayment: '',
      currency: 'PHP',
    })
    setCatalogSearch('')
    setBookingOpen(true)
  }

  const submit = () => {
    create.mutate({
      ...form,
      customerId: canManage && form.customerId ? form.customerId : undefined,
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      requiredDownPayment: String(form.requiredDownPayment),
    })
  }

  const closeDetail = () => {
    setSelectedId(null)
    setAmount('')
  }

  const runOnlinePayment = () => {
    if (!selectedRental?.paymentObligationId || !onlineAmount) return
    checkoutOnline.mutate({ obligationId: selectedRental.paymentObligationId, value: onlineAmount })
  }

  const runManualPayment = () => {
    if (!selectedRental?.paymentObligationId || !amount) return
    pay.mutate({ id: selectedRental.paymentObligationId, value: amount })
  }

  const selectedCatalogResource = catalogRows.find((item) => (item.resourceId ?? item.id) === form.resourceId)
  const durationHours = form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd
    ? (new Date(form.scheduledEnd).getTime() - new Date(form.scheduledStart).getTime()) / 3600000
    : 0
  const selectedRate = Number(selectedCatalogResource?.rentalRate ?? 0)
  const estimatedTotal = durationHours > 0 && selectedRate > 0 ? durationHours * selectedRate : 0

  return (
    <div className="grid gap-6">
      <PageHeader
        title={customerView ? 'Rent with Cadenza' : 'Rental Management'}
        description={
          customerView
            ? 'Browse instruments and band rooms, choose your time, review the deposit, and complete your booking online.'
            : 'Operate customer rentals from booking and payment through checkout and return.'
        }
        actions={!customerView && canCreate ? <Button onClick={() => openBooking('INSTRUMENT')}>New rental</Button> : null}
      />

      {detailError && (
        <Alert variant="destructive"><AlertDescription>{detailError.message}</AlertDescription></Alert>
      )}

      {customerView ? (
        <>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid gap-8 p-6 lg:grid-cols-[1.35fr_.9fr] lg:p-8">
                <div className="space-y-5">
                  <Badge variant="secondary" className="w-fit">Cadenza Rentals</Badge>
                  <div>
                    <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                      Book the right space or instrument for your next session.
                    </h1>
                    <p className="mt-3 max-w-2xl text-muted-foreground">
                      Pick what you need, tell us when you need it, and we’ll show resources available for that time.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant={bookingType === 'INSTRUMENT' ? 'default' : 'outline'}
                      className="h-auto justify-start p-4 text-left"
                      onClick={() => { setBookingType('INSTRUMENT'); setForm((value) => ({ ...value, rentalType: 'INSTRUMENT', resourceId: '' })) }}
                    >
                      <span><span className="block font-semibold">Instruments</span><span className="mt-1 block text-xs font-normal opacity-80">Guitars, drums, keyboards and more</span></span>
                    </Button>
                    <Button
                      variant={bookingType === 'ROOM' ? 'default' : 'outline'}
                      className="h-auto justify-start p-4 text-left"
                      onClick={() => { setBookingType('ROOM'); setForm((value) => ({ ...value, rentalType: 'ROOM', resourceId: '' })) }}
                    >
                      <span><span className="block font-semibold">Band rooms</span><span className="mt-1 block text-xs font-normal opacity-80">Reserve a room for rehearsal or a session</span></span>
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-5">
                  <p className="font-semibold">Find availability</p>
                  <p className="mt-1 text-sm text-muted-foreground">Choose your rental window first.</p>
                  <div className="mt-5 grid gap-4">
                    <div className="grid gap-2">
                      <Label>Start</Label>
                      <Input type="datetime-local" value={form.scheduledStart} onChange={(event) => { const { value } = event.currentTarget; setForm((current) => ({ ...(current || {}), scheduledStart: value, resourceId: '' })) }} />
                    </div>
                    <div className="grid gap-2">
                      <Label>End</Label>
                      <Input type="datetime-local" value={form.scheduledEnd} onChange={(event) => { const { value } = event.currentTarget; setForm((current) => ({ ...(current || {}), scheduledEnd: value, resourceId: '' })) }} />
                    </div>
                    {form.scheduledStart && form.scheduledEnd && form.scheduledStart >= form.scheduledEnd && (
                      <p className="text-sm text-destructive">End time must be after the start time.</p>
                    )}
                    {availability.isLoading && <p className="text-sm text-muted-foreground">Checking availability…</p>}
                    {availability.isSuccess && <p className="text-sm font-medium">{filteredCatalog.length} resource{filteredCatalog.length === 1 ? '' : 's'} available for this time.</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{bookingType === 'ROOM' ? 'Choose a band room' : 'Choose an instrument'}</h2>
                <p className="text-sm text-muted-foreground">
                  {form.scheduledStart && form.scheduledEnd ? 'Only resources available for your selected time are shown.' : 'Choose a time above to check live availability.'}
                </p>
              </div>
              <Input className="sm:max-w-xs" value={catalogSearch} onChange={(event) => setCatalogSearch(event.currentTarget.value)} placeholder={bookingType === 'ROOM' ? 'Search rooms…' : 'Search instruments…'} />
            </div>

            {filteredCatalog.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
                {availability.isSuccess ? 'No resources are available for that rental window.' : 'No resources match your search.'}
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCatalog.map((resource) => {
                  const id = resource.resourceId ?? resource.id
                  const rate = Number(resource.rentalRate ?? 0)
                  return (
                    <Card key={id} className="flex h-full flex-col overflow-hidden">
                      <div className="flex h-36 items-end border-b bg-muted/40 p-5">
                        <Badge variant="outline">{bookingType === 'ROOM' ? 'Band room' : 'Instrument'}</Badge>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{resourceTitle(resource, bookingType)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{resourceSubtitle(resource, bookingType) || 'Cadenza rental resource'}</p>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Rental rate</p>
                            <p className="text-xl font-bold">{formatCurrency(rate)} <span className="text-xs font-normal text-muted-foreground">/ hour</span></p>
                          </div>
                          <Badge variant="secondary">{resource.status || 'AVAILABLE'}</Badge>
                        </div>
                        <div className="mt-auto pt-5">
                          <Button className="w-full" onClick={() => openBooking(bookingType, id)}>
                            Select & book
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <section className="grid gap-4">
            <div>
              <h2 className="text-xl font-semibold">My rentals</h2>
              <p className="text-sm text-muted-foreground">Track upcoming bookings, active rentals, payments, and completed rentals.</p>
            </div>
            {allRows.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">You have no rentals yet. Start by choosing an instrument or band room above.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {allRows.map((rental) => (
                  <Card key={rental.id}>
                    <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{resourceNameMap.get(rental.resourceId) || (rental.rentalType === 'ROOM' ? 'Band room' : 'Instrument')}</p>
                          <Badge variant={rental.status === 'CANCELLED' ? 'outline' : 'secondary'}>{stageFor(rental.status)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{new Date(rental.scheduledStart).toLocaleString()} – {new Date(rental.scheduledEnd).toLocaleString()}</p>
                        <p className="mt-2 text-sm"><span className="text-muted-foreground">Total </span>{formatCurrency(rental.totalAmount)} · <span className="text-muted-foreground">Deposit </span>{formatCurrency(rental.requiredDownPayment)}</p>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedId(rental.id)}>View booking</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            {STATUS.slice(1).map((item) => {
              const count = allRows.filter((r) => r.status === item.value).length
              return <Card key={item.value}><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold">{count}</p></CardContent></Card>
            })}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Rental operations</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Search bookings and operate each rental through its lifecycle.</p>
              </div>
              <div className="w-56"><SelectField label="Status" options={STATUS} value={statusFilter} onChange={(value) => setStatusFilter(value ?? 'ALL')} /></div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'customer', header: 'Customer', value: (r) => customerName(r.customer) },
                  { key: 'resource', header: 'Rental', value: (r) => resourceNameMap.get(r.resourceId) || (r.rentalType === 'ROOM' ? 'Band room' : 'Instrument') },
                  { key: 'schedule', header: 'Schedule', value: (r) => new Date(r.scheduledStart).toLocaleString() + ' – ' + new Date(r.scheduledEnd).toLocaleString() },
                  { key: 'financial', header: 'Amount', value: (r) => `${formatCurrency(r.requiredDownPayment)} down / ${formatCurrency(r.totalAmount)} total` },
                  { key: 'status', header: 'Stage', render: (r) => <Badge variant={r.status === 'CANCELLED' ? 'outline' : 'secondary'}>{stageFor(r.status)}</Badge> },
                  { key: 'actions', header: 'Action', searchable: false, render: (r) => <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>Open</Button> },
                ]}
                rows={rows}
                searchPlaceholder="Search rentals by customer or rental…"
              />
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{canManage ? 'Create rental booking' : 'Book your rental'}</DialogTitle>
            <DialogDescription>
              {canManage ? 'Create a customer booking from the staff workspace.' : 'Review the resource, schedule, deposit, and total before confirming.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Selected resource</p>
                  <p className="mt-1 text-lg font-semibold">{resourceTitle(selectedCatalogResource, form.rentalType)}</p>
                  <p className="text-sm text-muted-foreground">{resourceSubtitle(selectedCatalogResource, form.rentalType) || 'Cadenza rental resource'}</p>
                </div>
                {selectedRate > 0 && <Badge variant="secondary">{formatCurrency(selectedRate)} / hour</Badge>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant={form.rentalType === 'INSTRUMENT' ? 'default' : 'outline'}
                className="h-auto justify-start p-4 text-left"
                onClick={() => setForm((current) => ({ ...(current || {}), rentalType: 'INSTRUMENT', resourceId: '' }))}
              >
                <span><span className="block font-semibold">Instrument rental</span><span className="mt-1 block text-xs font-normal opacity-80">Choose an instrument from the available inventory.</span></span>
              </Button>
              <Button
                type="button"
                variant={form.rentalType === 'ROOM' ? 'default' : 'outline'}
                className="h-auto justify-start p-4 text-left"
                onClick={() => setForm((current) => ({ ...(current || {}), rentalType: 'ROOM', resourceId: '' }))}
              >
                <span><span className="block font-semibold">Band room rental</span><span className="mt-1 block text-xs font-normal opacity-80">Choose a room for the scheduled session.</span></span>
              </Button>
            </div>

            {canManage && (
              <SelectField
                label="Customer"
                options={customerRows.map((customer) => ({ value: customer.id, label: customerName(customer) }))}
                value={form.customerId}
                onChange={(value) => setForm((current) => ({ ...(current || {}), customerId: value ?? '' }))}
                placeholder="Choose a customer"
                disabled={customers.isLoading}
              />
            )}

            <SelectField
              label={form.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}
              options={catalogRows.map((resource) => ({
                value: resource.resourceId ?? resource.id,
                label: resourceTitle(resource, form.rentalType),
              }))}
              value={form.resourceId}
              onChange={(value) => setForm((current) => ({ ...(current || {}), resourceId: value ?? '' }))}
              placeholder={form.rentalType === 'ROOM' ? 'Choose a band room' : 'Choose an instrument'}
              disabled={availability.isLoading}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={(event) => { const { value } = event.currentTarget; setForm((current) => ({ ...(current || {}), scheduledStart: value })) }} /></div>
              <div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={(event) => { const { value } = event.currentTarget; setForm((current) => ({ ...(current || {}), scheduledEnd: value })) }} /></div>
            </div>

            {availability.isSuccess && form.resourceId && !availableResourceIds.has(form.resourceId) && (
              <Alert variant="destructive"><AlertDescription>The selected resource is no longer available for this time. Choose another resource or adjust the rental window.</AlertDescription></Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Booking deposit</Label>
                <Input type="number" min="0.01" step="0.01" value={form.requiredDownPayment} onChange={(event) => { const { value } = event.currentTarget; setForm((current) => ({ ...(current || {}), requiredDownPayment: value })) }} />
                <p className="text-xs text-muted-foreground">The deposit is due at booking. The remaining balance is paid when the rental is used.</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Estimated rental total</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(estimatedTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{durationHours ? `${durationHours.toFixed(2)} hour${durationHours === 1 ? '' : 's'} × ${formatCurrency(selectedRate)}/hour` : 'Select a valid rental window.'}</p>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-semibold">Booking summary</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Rental total</span><span>{formatCurrency(estimatedTotal)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Due at booking</span><span>{formatCurrency(form.requiredDownPayment || 0)}</span></div>
                <div className="flex justify-between gap-4 border-t pt-2 font-semibold"><span>Remaining balance</span><span>{formatCurrency(Math.max(estimatedTotal - Number(form.requiredDownPayment || 0), 0))}</span></div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={
                create.isPending ||
                !form.resourceId ||
                !form.scheduledStart ||
                !form.scheduledEnd ||
                form.scheduledStart >= form.scheduledEnd ||
                !form.requiredDownPayment ||
                Number(form.requiredDownPayment) <= 0 ||
                (estimatedTotal > 0 && Number(form.requiredDownPayment) > estimatedTotal) ||
                (canManage && !form.customerId) ||
                (availability.isSuccess && !availableResourceIds.has(form.resourceId))
              }
              onClick={submit}
            >
              {create.isPending ? 'Creating booking…' : canManage ? 'Create rental' : 'Confirm booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedId)} onOpenChange={(value) => !value && closeDetail()}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1400px]">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
            <DialogTitle className="text-lg">Rental {selectedRental?.id ? selectedRental.id.slice(0, 8).toUpperCase() : ''}</DialogTitle>
            <DialogDescription>
              {selectedRental ? `${customerName(selectedRental.customer)} · ${selectedRental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}` : 'Loading rental…'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {selected.isLoading ? (
              <LoadingState label="Loading rental…" rows={3} />
            ) : selectedRental ? (
              <div className="grid gap-6">
                <div className="grid gap-2 md:grid-cols-4">
                  {workflowSteps.map((step, index) => {
                    const currentIndex = selectedRental.status === 'PENDING' ? 0 : selectedRental.status === 'RESERVED' ? 1 : selectedRental.status === 'CHECKED_OUT' ? 2 : selectedRental.status === 'RETURNED' ? 3 : -1
                    const active = currentIndex >= index
                    return <div key={step} className={`rounded-md border p-3 text-sm ${active ? 'bg-muted' : ''}`}><p className="font-medium">{index + 1}. {step}</p>{index === currentIndex && <p className="mt-1 text-xs text-muted-foreground">Current stage</p>}</div>
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Booking details</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><Badge>{stageFor(selectedRental.status)}</Badge></div>
                      {canManage && <><div className="flex justify-between gap-4"><span className="text-muted-foreground">Customer</span><span>{customerName(selectedRental.customer)}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="text-right">{selectedRental.customer?.person?.email || '—'}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span>{selectedRental.customer?.person?.phone || '—'}</span></div></>}
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Resource</span><span className="text-right">{selectedRental.resource?.name || resourceNameMap.get(selectedRental.resourceId) || selectedRental.resourceId}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Type</span><span>{selectedRental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}</span></div>
                      {selectedRental.rentalType === 'INSTRUMENT' && selectedRental.instrument && <><div className="flex justify-between gap-4"><span className="text-muted-foreground">Instrument</span><span>{selectedRental.instrument.instrumentType}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Brand / model</span><span>{[selectedRental.instrument.brand, selectedRental.instrument.model].filter(Boolean).join(' / ') || '—'}</span></div>{canManage && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Serial number</span><span>{selectedRental.instrument.serialNumber || '—'}</span></div>}</>}
                      {selectedRental.rentalType === 'ROOM' && selectedRental.room && <><div className="flex justify-between gap-4"><span className="text-muted-foreground">Room type</span><span>{selectedRental.room.roomType}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Capacity</span><span>{selectedRental.room.capacity}</span></div></>}
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Start</span><span className="text-right">{new Date(selectedRental.scheduledStart).toLocaleString()}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">End</span><span className="text-right">{new Date(selectedRental.scheduledEnd).toLocaleString()}</span></div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">Payment summary</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                      {payment.isLoading ? <p className="text-muted-foreground">Loading payment…</p> : <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatCurrency(obligation?.totalAmount ?? selectedRental.totalAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>{formatCurrency(selectedRental.requiredDownPayment)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatCurrency(obligation?.netPaidAmount ?? obligation?.paidAmount)}</span></div>
                        <div className="flex justify-between border-t pt-2 font-semibold"><span>Balance</span><span>{formatCurrency(balanceDue)}</span></div>
                        <Badge variant={obligation?.status === 'PAID' ? 'default' : 'secondary'} className="w-fit">{obligation?.status || 'PENDING'}</Badge>
                      </>}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base">{canManage ? 'Rental operations' : 'What happens next'}</CardTitle></CardHeader>
                  <CardContent>
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRental.paymentObligationId && Number(balanceDue) > 0 && selectedRental.status !== 'CANCELLED' && (
                          <><Input className="w-40" type="number" min="0.01" step="0.01" placeholder="Payment amount" value={amount} onChange={(event) => setAmount(event.currentTarget.value)} /><Button variant="outline" onClick={runManualPayment} disabled={!amount || pay.isPending}>{pay.isPending ? 'Recording…' : 'Record payment'}</Button></>
                        )}
                        {canManage && selectedRental.status === 'RESERVED' && <Button onClick={() => lifecycle.mutate({ type: 'checkout', id: selectedRental.id })} disabled={lifecycle.isPending}>Check out</Button>}
                        {canManage && selectedRental.status === 'CHECKED_OUT' && <Button onClick={() => lifecycle.mutate({ type: 'returnRental', id: selectedRental.id })} disabled={lifecycle.isPending || balanceDue > 0}>Return</Button>}
                        {(selectedRental.status === 'PENDING' || selectedRental.status === 'RESERVED') && <Button variant="destructive" onClick={() => lifecycle.mutate({ type: 'cancel', id: selectedRental.id })} disabled={lifecycle.isPending}>Cancel</Button>}
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <p className="text-sm text-muted-foreground">
                          {selectedRental.status === 'PENDING'
                            ? 'Your booking is awaiting the required deposit. Complete the payment below to continue the reservation.'
                            : selectedRental.status === 'RESERVED'
                              ? 'Your rental is reserved. Cadenza will prepare the resource for your scheduled time.'
                              : selectedRental.status === 'CHECKED_OUT'
                                ? 'Your rental is active.'
                                : selectedRental.status === 'RETURNED'
                                  ? 'Your rental is complete.'
                                  : 'This booking has been cancelled.'}
                        </p>
                        {canPay && Number(onlineAmount) > 0 && !['RETURNED', 'CANCELLED'].includes(selectedRental.status) && (
                          <Button className="w-fit" onClick={runOnlinePayment} disabled={checkoutOnline.isPending}>{checkoutOnline.isPending ? 'Opening checkout…' : selectedRental.status === 'PENDING' ? 'Pay booking deposit online' : 'Pay remaining balance online'}</Button>
                        )}
                        {(selectedRental.status === 'PENDING' || selectedRental.status === 'RESERVED') && (
                          <Button variant="outline" className="w-fit" onClick={() => lifecycle.mutate({ type: 'cancel', id: selectedRental.id })} disabled={lifecycle.isPending || Number(obligation?.netPaidAmount ?? obligation?.paidAmount ?? 0) > 0}>Cancel booking</Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
                  <CardContent className="grid gap-2">
                    {history.isLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : unwrap(history.data).length ? unwrap(history.data).map((entry) => <div key={entry.id} className="flex justify-between border-b py-2 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}
                  </CardContent>
                </Card>
              </div>
            ) : <p className="text-sm text-muted-foreground">Rental not found.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
