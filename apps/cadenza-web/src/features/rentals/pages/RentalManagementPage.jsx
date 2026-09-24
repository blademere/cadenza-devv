import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import RentalBookingDialog from '../components/RentalBookingDialog'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (value) => value?.data ?? value ?? []
const nameOf = (r) => [r.customer?.person?.firstName, r.customer?.person?.lastName].filter(Boolean).join(' ') || r.customer?.person?.email || r.customerId || 'Customer'
const resourceOf = (r) => r.resource?.name || (r.rentalType === 'ROOM' ? 'Band room' : 'Instrument')
const statusLabel = (s) => ({ PENDING: 'Booking', RESERVED: 'Reserved', CHECKED_OUT: 'Checked out', ACTIVE: 'Checked out', RETURNED: 'Returned', CANCELLED: 'Cancelled' }[s] || s)

const FILTERS = [
  ['ALL', 'All'],
  ['PENDING', 'Bookings'],
  ['RESERVED', 'Ready for checkout'],
  ['CHECKED_OUT', 'Active'],
  ['RETURNED', 'Returned'],
  ['CANCELLED', 'Cancelled'],
]
const matchesFilter = (r, filter) => filter === 'ALL' || (filter === 'CHECKED_OUT' ? ['CHECKED_OUT', 'ACTIVE'].includes(r.status) : r.status === filter)

export default function RentalManagementPage() {
  const client = useQueryClient()
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState('')
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const selected = useQuery({ queryKey: ['cadenza', 'rental', selectedId], queryFn: () => rentalsApi.get(selectedId), enabled: Boolean(selectedId) })
  const selectedRental = unwrap(selected.data)
  const payment = useQuery({ queryKey: ['cadenza', 'rental-payment', selectedRental?.paymentObligationId], queryFn: () => paymentsApi.get(selectedRental.paymentObligationId), enabled: Boolean(selectedRental?.paymentObligationId) })
  const history = useQuery({ queryKey: ['cadenza', 'rental-payment-history', selectedRental?.paymentObligationId], queryFn: () => paymentsApi.history(selectedRental.paymentObligationId), enabled: Boolean(selectedRental?.paymentObligationId) })

  const lifecycle = useMutation({
    mutationFn: ({ action, id }) => rentalsApi[action](id),
    onSuccess: async (_, vars) => {
      await client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental', vars.id] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental-payment'] })
    },
  })
  const pay = useMutation({
    mutationFn: ({ id, value }) => paymentsApi.pay(id, { amount: String(value), currency: 'PHP', method: 'CASH' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental', selectedId] })
      await client.invalidateQueries({ queryKey: ['cadenza', 'rental-payment-history'] })
      setAmount('')
    },
  })

  if (rentals.isLoading) return <LoadingState label="Loading rental management…" rows={6} />
  if (rentals.error) return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>

  const allRows = unwrap(rentals.data)
  const outstandingCount = allRows.filter((r) => !['CANCELLED', 'RETURNED'].includes(r.status) && Number(r.balanceDue ?? r.outstandingAmount ?? 0) > 0).length
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allRows.filter((r) => matchesFilter(r, filter) && (!term || [nameOf(r), resourceOf(r), r.rentalType, r.id].join(' ').toLowerCase().includes(term)))
  }, [allRows, filter, search])

  const obligation = selectedRental?.payment ?? unwrap(payment.data)
  const balance = Number(obligation?.balanceDue ?? selectedRental?.balanceDue ?? selectedRental?.outstandingAmount ?? 0)
  const detailError = selected.error || payment.error || history.error || lifecycle.error || pay.error
  const action = selectedRental?.status === 'RESERVED'
    ? { label: 'Check out rental', action: 'checkout' }
    : ['CHECKED_OUT', 'ACTIVE'].includes(selectedRental?.status)
      ? { label: balance > 0 ? 'Collect balance first' : 'Mark returned', action: balance > 0 ? null : 'returnRental' }
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental Management"
        description="One workspace for bookings, checkout, returns, and rental payments."
        actions={<Button onClick={() => setBookingOpen(true)}>Add rental booking</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Summary label="All rentals" value={allRows.length} />
        <Summary label="New bookings" value={allRows.filter((r) => r.status === 'PENDING').length} />
        <Summary label="Ready" value={allRows.filter((r) => r.status === 'RESERVED').length} />
        <Summary label="Active" value={allRows.filter((r) => ['CHECKED_OUT', 'ACTIVE'].includes(r.status)).length} />
        <Summary label="Balances due" value={outstandingCount} />
      </div>
      <Card>
        <CardHeader className="space-y-4">
          <div><CardTitle>Rental workspace</CardTitle><p className="mt-1 text-sm text-muted-foreground">Use the status views below instead of separate booking, checkout, return, and payment pages.</p></div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1 rounded-lg border p-1">
              {FILTERS.map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'ghost'} onClick={() => setFilter(value)}>{label}</Button>)}
            </div>
            <Input className="lg:w-80" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Search customer, resource, or rental…" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filtered}
            searchPlaceholder="Search rentals…"
            emptyMessage="No rentals match this view."
            columns={[
              { key: 'customer', header: 'Customer', value: nameOf },
              { key: 'resource', header: 'Rental', value: resourceOf },
              { key: 'schedule', header: 'Schedule', value: (r) => r.scheduledStart ? new Date(r.scheduledStart).toLocaleString() : '—' },
              { key: 'status', header: 'Stage', render: (r) => <Badge variant="secondary">{statusLabel(r.status)}</Badge> },
              { key: 'amount', header: 'Balance', value: (r) => formatCurrency(r.balanceDue ?? r.outstandingAmount ?? 0) },
              { key: 'action', header: 'Action', searchable: false, render: (r) => <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>Open</Button> },
            ]}
          />
        </CardContent>
      </Card>

      <RentalBookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[1100px]">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
            <DialogTitle>{selectedRental ? resourceOf(selectedRental) : 'Rental details'}</DialogTitle>
            <DialogDescription>{selectedRental ? `${nameOf(selectedRental)} · ${statusLabel(selectedRental.status)}` : 'Loading rental…'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {selected.isLoading ? <LoadingState label="Loading rental…" rows={3} /> : selectedRental ? (
              <div className="grid gap-6">
                {detailError && <Alert variant="destructive"><AlertDescription>{detailError.message}</AlertDescription></Alert>}
                <div className="grid gap-3 md:grid-cols-4">
                  {['Booking', 'Reserved', 'Checked out', 'Returned'].map((step, i) => {
                    const current = selectedRental.status === 'PENDING' ? 0 : selectedRental.status === 'RESERVED' ? 1 : ['CHECKED_OUT', 'ACTIVE'].includes(selectedRental.status) ? 2 : selectedRental.status === 'RETURNED' ? 3 : -1
                    return <div key={step} className={current >= i ? 'rounded-lg border bg-muted p-3' : 'rounded-lg border p-3'}><p className="text-sm font-medium">{i + 1}. {step}</p>{current === i && <p className="mt-1 text-xs text-muted-foreground">Current stage</p>}</div>
                  })}
                </div>
                <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
                  <Card><CardHeader><CardTitle className="text-base">Rental details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
                    <Row label="Customer" value={nameOf(selectedRental)} /><Row label="Resource" value={resourceOf(selectedRental)} /><Row label="Type" value={selectedRental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'} /><Row label="Start" value={selectedRental.scheduledStart ? new Date(selectedRental.scheduledStart).toLocaleString() : '—'} /><Row label="End" value={selectedRental.scheduledEnd ? new Date(selectedRental.scheduledEnd).toLocaleString() : '—'} /><Row label="Status" value={statusLabel(selectedRental.status)} />
                  </CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
                    <Row label="Total" value={formatCurrency(obligation?.totalAmount ?? selectedRental.totalAmount)} /><Row label="Deposit" value={formatCurrency(selectedRental.requiredDownPayment)} /><Row label="Paid" value={formatCurrency(obligation?.netPaidAmount ?? obligation?.paidAmount)} /><Row label="Balance" value={formatCurrency(balance)} />
                  </CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle className="text-base">Next action</CardTitle></CardHeader><CardContent className="space-y-4">
                  {action?.action && <Button onClick={() => lifecycle.mutate({ action: action.action, id: selectedRental.id })} disabled={lifecycle.isPending}>{lifecycle.isPending ? 'Saving…' : action.label}</Button>}
                  {selectedRental.status === 'PENDING' && <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Awaiting booking deposit</Badge><Button variant="destructive" onClick={() => lifecycle.mutate({ action: 'cancel', id: selectedRental.id })} disabled={lifecycle.isPending}>Cancel</Button></div>}
                  {selectedRental.status === 'CHECKED_OUT' && balance > 0 && <div className="flex flex-wrap gap-3"><Input className="w-48" type="number" min="0.01" step="0.01" placeholder="Cash amount" value={amount} onChange={(e) => setAmount(e.currentTarget.value)} /><Button onClick={() => pay.mutate({ id: selectedRental.paymentObligationId, value: amount })} disabled={!amount || pay.isPending}>{pay.isPending ? 'Recording…' : 'Record cash payment'}</Button></div>}
                  {selectedRental.status === 'CHECKED_OUT' && balance <= 0 && <Badge>Payment settled — ready to return</Badge>}
                </CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader><CardContent>{history.isLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : unwrap(history.data).length ? <div className="divide-y">{unwrap(history.data).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span className="font-medium">{formatCurrency(entry.amount)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</CardContent></Card>
              </div>
            ) : <p className="text-sm text-muted-foreground">Rental not found.</p>}
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4"><Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Summary({ label, value }) { return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card> }
function Row({ label, value }) { return <div className="flex justify-between gap-4 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }
