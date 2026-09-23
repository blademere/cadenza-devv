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

const stageFor = (status) => {
  if (status === 'PENDING') return 'Booking'
  if (status === 'RESERVED') return 'Reserved / Prepare'
  if (status === 'CHECKED_OUT') return 'Active rental'
  if (status === 'RETURNED') return 'Returned / Settled'
  if (status === 'CANCELLED') return 'Cancelled'
  return status
}

const customerName = (customer) => {
  const person = customer?.person
  return (
    [person?.firstName, person?.middleName, person?.lastName, person?.suffix]
      .filter(Boolean)
      .join(' ') ||
    person?.email ||
    customer?.id ||
    'Customer'
  )
}

const channelLabel = (rental) =>
  rental?.metadata?.channel === 'WALK_IN' ? 'Walk-in' : 'Online'

const workflowSteps = ['Booking', 'Reserved / Prepare', 'Active rental', 'Returned / Settled']

export default function RentalsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreate = can('cadenza_rentals:create')
  const canManage = can('cadenza_rentals:manage')
  const canPay = can('cadenza_payments:create')

  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
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
    queryKey: [
      'cadenza',
      'rental-availability',
      form.rentalType,
      form.scheduledStart,
      form.scheduledEnd,
    ],
    queryFn: () =>
      rentalsApi.availability({
        rentalType: form.rentalType,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      }),
    enabled: Boolean(
      form.scheduledStart &&
        form.scheduledEnd &&
        form.scheduledStart < form.scheduledEnd,
    ),
  })

  const payment = useQuery({
    queryKey: ['cadenza', 'rental-payment', selectedId, selectedRental?.paymentObligationId],
    queryFn: () => paymentsApi.get(selectedRental.paymentObligationId),
    enabled: Boolean(selectedRental?.paymentObligationId),
  })

  const history = useQuery({
    queryKey: ['cadenza', 'rental-payment-history', selectedRental?.paymentObligationId],
    queryFn: () => paymentsApi.history(selectedRental.paymentObligationId),
    enabled: Boolean(selectedRental?.paymentObligationId && canManage),
  })

  const create = useMutation({
    mutationFn: rentalsApi.create,
    onSuccess: async () => {
      setOpen(false)
      await client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
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
    mutationFn: ({ id, value }) =>
      paymentsApi.pay(id, {
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
    mutationFn: ({ obligationId, value }) =>
      paymentsApi.checkout(obligationId, {
        amount: String(value),
        description: 'Cadenza rental payment',
      }),
    onSuccess: (response) => {
      const value = unwrap(response)
      if (value?.checkoutUrl)
        window.open(value.checkoutUrl, '_blank', 'noopener,noreferrer')
    },
  })

  const resourceRows = availability.isSuccess
    ? unwrap(availability.data).map((entry) => entry.domain)
    : form.rentalType === 'ROOM'
      ? unwrap(rooms.data)
      : unwrap(instruments.data)

  const resourceNameMap = useMemo(() => {
    const map = new Map()
    unwrap(instruments.data).forEach((item) => {
      map.set(item.resourceId, item.instrumentType || item.resourceId)
    })
    unwrap(rooms.data).forEach((item) => {
      map.set(item.resourceId, item.roomType || item.resourceId)
    })
    return map
  }, [instruments.data, rooms.data])

  if (rentals.isLoading)
    return <LoadingState label="Loading rentals…" rows={5} />

  if (rentals.error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{rentals.error.message}</AlertDescription>
      </Alert>
    )

  const rows = unwrap(rentals.data).filter(
    (rental) => statusFilter === 'ALL' || rental.status === statusFilter,
  )
  const customerRows = unwrap(customers.data)
  const obligation = selectedRental?.payment ?? unwrap(payment.data)
  const balanceDue = Number(obligation?.balanceDue ?? selectedRental?.totalAmount ?? 0)
  const onlineAmount =
    selectedRental?.status === 'PENDING'
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

  const submit = () =>
    create.mutate({
      ...form,
      customerId: canManage && form.customerId ? form.customerId : undefined,
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      requiredDownPayment: String(form.requiredDownPayment),
    })

  const openNewRental = () => {
    setForm({
      customerId: '',
      resourceId: '',
      rentalType: 'INSTRUMENT',
      scheduledStart: '',
      scheduledEnd: '',
      requiredDownPayment: '',
      currency: 'PHP',
    })
    setOpen(true)
  }

  const closeDetail = () => {
    setSelectedId(null)
    setAmount('')
  }

  const runOnlinePayment = () => {
    if (!selectedRental?.paymentObligationId || !onlineAmount) return
    checkoutOnline.mutate({
      obligationId: selectedRental.paymentObligationId,
      value: onlineAmount,
    })
  }

  const runManualPayment = () => {
    if (!selectedRental?.paymentObligationId || !amount) return
    pay.mutate({ id: selectedRental.paymentObligationId, value: amount })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Rentals"
        description="One operational workspace for online and walk-in rentals, from booking through return and payment settlement."
        actions={
          canCreate && (
            <Button onClick={openNewRental}>
              {canManage ? 'New rental' : 'Book rental'}
            </Button>
          )
        }
      />

      {detailError && (
        <Alert variant="destructive">
          <AlertDescription>{detailError.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        {STATUS.slice(1).map((item) => {
          const count = unwrap(rentals.data).filter((r) => r.status === item.value).length
          return (
            <Card key={item.value}>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Rental workflow</CardTitle>
          <div className="w-56">
            <SelectField
              label="Status"
              options={STATUS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'ALL')}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'customer',
                header: 'Customer',
                value: (r) => customerName(r.customer),
              },
              {
                key: 'resource',
                header: 'Rental',
                value: (r) =>
                  resourceNameMap.get(r.resourceId) ||
                  (r.rentalType === 'ROOM' ? 'Band room' : 'Instrument'),
              },
              {
                key: 'channel',
                header: 'Source',
                render: (r) => <Badge variant="outline">{channelLabel(r)}</Badge>,
              },
              {
                key: 'schedule',
                header: 'Schedule',
                value: (r) =>
                  new Date(r.scheduledStart).toLocaleString() +
                  ' – ' +
                  new Date(r.scheduledEnd).toLocaleString(),
              },
              {
                key: 'financial',
                header: 'Amount',
                value: (r) =>
                  `${formatCurrency(r.requiredDownPayment)} down / ${formatCurrency(r.totalAmount)} total`,
              },
              {
                key: 'status',
                header: 'Stage',
                render: (r) => (
                  <Badge variant={r.status === 'CANCELLED' ? 'outline' : 'secondary'}>
                    {stageFor(r.status)}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Action',
                searchable: false,
                render: (r) => (
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>
                    Open
                  </Button>
                ),
              },
            ]}
            rows={rows}
            searchPlaceholder="Search rentals by customer or rental…"
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canManage ? 'New rental' : 'Book rental'}</DialogTitle>
            <DialogDescription>
              The same booking workflow is used for online customers and staff-created walk-in rentals. Availability is checked on the server.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {canManage && (
              <SelectField
                label="Customer"
                options={customerRows.map((customer) => ({
                  value: customer.id,
                  label: customerName(customer),
                }))}
                value={form.customerId}
                onChange={(value) => setForm({ ...form, customerId: value || '' })}
                placeholder="Choose a customer"
                disabled={customers.isLoading}
              />
            )}

            <SelectField
              label="Rental type"
              options={[
                { value: 'INSTRUMENT', label: 'Instrument' },
                { value: 'ROOM', label: 'Band room' },
              ]}
              value={form.rentalType}
              onChange={(value) =>
                setForm({
                  ...form,
                  rentalType: value || 'INSTRUMENT',
                  resourceId: '',
                })
              }
            />

            <SelectField
              label="Resource"
              options={resourceRows.map((resource) => ({
                value: resource.resourceId ?? resource.id,
                label:
                  resource.instrumentType ||
                  resource.roomType ||
                  resource.name ||
                  resource.resourceId ||
                  resource.id,
              }))}
              value={form.resourceId}
              onChange={(value) => setForm({ ...form, resourceId: value || '' })}
              placeholder="Choose an available resource"
            />

            <div className="grid gap-2">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(event) =>
                  setForm({ ...form, scheduledStart: event.currentTarget.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={(event) =>
                  setForm({ ...form, scheduledEnd: event.currentTarget.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Required down payment</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.requiredDownPayment}
                onChange={(event) =>
                  setForm({
                    ...form,
                    requiredDownPayment: event.currentTarget.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={
                create.isPending ||
                !form.resourceId ||
                !form.scheduledStart ||
                !form.scheduledEnd ||
                !form.requiredDownPayment
              }
              onClick={submit}
            >
              {create.isPending ? 'Booking…' : 'Create rental'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedId)} onOpenChange={(value) => !value && closeDetail()}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
            <DialogTitle className="text-lg">
              Rental {selectedRental?.id ? selectedRental.id.slice(0, 8).toUpperCase() : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedRental
                ? `${customerName(selectedRental.customer)} · ${selectedRental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'} · ${channelLabel(selectedRental)}`
                : 'Loading rental…'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {selected.isLoading ? (
            <LoadingState label="Loading rental…" rows={3} />
          ) : selectedRental ? (
            <div className="grid gap-6">
              <div className="grid gap-2 md:grid-cols-4">
                {workflowSteps.map((step, index) => {
                  const currentIndex =
                    selectedRental.status === 'PENDING'
                      ? 0
                      : selectedRental.status === 'RESERVED'
                        ? 1
                        : selectedRental.status === 'CHECKED_OUT'
                          ? 2
                          : selectedRental.status === 'RETURNED'
                            ? 3
                            : -1
                  const active = currentIndex >= index
                  return (
                    <div
                      key={step}
                      className={`rounded-md border p-3 text-sm ${active ? 'bg-muted' : ''}`}
                    >
                      <p className="font-medium">{index + 1}. {step}</p>
                      {index === currentIndex && (
                        <p className="mt-1 text-xs text-muted-foreground">Current stage</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Customer & rental</CardTitle></CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{stageFor(selectedRental.status)}</Badge></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Customer</span><span>{customerName(selectedRental.customer)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Email</span><span>{selectedRental.customer?.person?.email || '—'}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span>{selectedRental.customer?.person?.phone || '—'}</span></div>

                    <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{channelLabel(selectedRental)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Rental ID</span><span className="font-mono text-xs">{selectedRental.id}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Resource</span><span className="text-right">{selectedRental.resource?.name || resourceNameMap.get(selectedRental.resourceId) || selectedRental.resourceId}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Resource type</span><span>{selectedRental.resource?.type || selectedRental.rentalType}</span></div>
                    {selectedRental.rentalType === 'INSTRUMENT' && selectedRental.instrument && (
                      <>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Instrument</span><span>{selectedRental.instrument.instrumentType}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Brand / model</span><span>{[selectedRental.instrument.brand, selectedRental.instrument.model].filter(Boolean).join(' / ') || '—'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Serial number</span><span>{selectedRental.instrument.serialNumber || '—'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Rental rate</span><span>{formatCurrency(selectedRental.instrument.rentalRate)} / hour</span></div>
                      </>
                    )}
                    {selectedRental.rentalType === 'ROOM' && selectedRental.room && (
                      <>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Room type</span><span>{selectedRental.room.roomType}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Capacity</span><span>{selectedRental.room.capacity}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Rental rate</span><span>{formatCurrency(selectedRental.room.rentalRate)} / hour</span></div>
                      </>
                    )}
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Start</span><span className="text-right">{new Date(selectedRental.scheduledStart).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">End</span><span>{new Date(selectedRental.scheduledEnd).toLocaleString()}</span></div>
                    {selectedRental.checkedOutAt && <div className="flex justify-between"><span className="text-muted-foreground">Checked out</span><span>{new Date(selectedRental.checkedOutAt).toLocaleString()}</span></div>}
                    {selectedRental.returnedAt && <div className="flex justify-between"><span className="text-muted-foreground">Returned</span><span>{new Date(selectedRental.returnedAt).toLocaleString()}</span></div>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Financial summary</CardTitle></CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    {payment.isLoading ? (
                      <p className="text-muted-foreground">Loading payment…</p>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatCurrency(obligation?.totalAmount ?? selectedRental.totalAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Required down</span><span>{formatCurrency(selectedRental.requiredDownPayment)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatCurrency(obligation?.netPaidAmount ?? obligation?.paidAmount)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Balance</span><span>{formatCurrency(balanceDue)}</span></div>
                        <Badge variant={obligation?.status === 'PAID' ? 'default' : 'secondary'} className="w-fit">{obligation?.status || 'PENDING'}</Badge>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                {canPay && selectedRental.paymentObligationId && Number(onlineAmount) > 0 && selectedRental.status !== 'RETURNED' && selectedRental.status !== 'CANCELLED' && (
                  <Button
                    onClick={runOnlinePayment}
                    disabled={checkoutOnline.isPending}
                  >
                    {checkoutOnline.isPending ? 'Opening checkout…' : canManage ? 'Pay online' : 'Pay down payment online'}
                  </Button>
                )}

                {canManage && selectedRental.paymentObligationId && Number(balanceDue) > 0 && selectedRental.status !== 'CANCELLED' && (
                  <>
                    <Input
                      className="w-40"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Payment amount"
                      value={amount}
                      onChange={(event) => setAmount(event.currentTarget.value)}
                    />
                    <Button variant="outline" onClick={runManualPayment} disabled={!amount || pay.isPending}>
                      {pay.isPending ? 'Recording…' : 'Record payment'}
                    </Button>
                  </>
                )}

                {canManage && selectedRental.status === 'RESERVED' && (
                  <Button
                    onClick={() => lifecycle.mutate({ type: 'checkout', id: selectedRental.id })}
                    disabled={lifecycle.isPending}
                  >
                    Check out
                  </Button>
                )}

                {canManage && selectedRental.status === 'CHECKED_OUT' && (
                  <Button
                    onClick={() => lifecycle.mutate({ type: 'returnRental', id: selectedRental.id })}
                    disabled={lifecycle.isPending || balanceDue > 0}
                  >
                    Return
                  </Button>
                )}

                {(selectedRental.status === 'PENDING' || selectedRental.status === 'RESERVED') && (
                  <Button
                    variant="destructive"
                    onClick={() => lifecycle.mutate({ type: 'cancel', id: selectedRental.id })}
                    disabled={lifecycle.isPending}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {canManage && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
                  <CardContent className="grid gap-2">
                    {history.isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading history…</p>
                    ) : unwrap(history.data).length ? (
                      unwrap(history.data).map((entry) => (
                        <div key={entry.id} className="flex justify-between border-b py-2 text-sm">
                          <span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span>
                          <span>{formatCurrency(entry.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No payments recorded.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Rental not found.</p>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
