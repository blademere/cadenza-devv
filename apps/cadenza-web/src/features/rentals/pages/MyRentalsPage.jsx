import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (value) => value?.data ?? value ?? []
const ACTIVE_STATUSES = ['PENDING', 'RESERVED', 'ACTIVE']
const money = (value) => formatCurrency(Number(value ?? 0))
const rentalLabel = (item) => item.resource?.name ?? (item.rentalType === 'ROOM' ? 'Band room' : 'Instrument')

export default function MyRentalsPage() {
  const client = useQueryClient()
  const [selectedRentalId, setSelectedRentalId] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const selected = useQuery({ queryKey: ['cadenza', 'rental', selectedRentalId], queryFn: () => rentalsApi.get(selectedRentalId), enabled: Boolean(selectedRentalId) })
  const selectedRental = unwrap(selected.data)
  const payment = useQuery({ queryKey: ['cadenza', 'rental-payment', selectedRentalId], queryFn: () => paymentsApi.get(selectedRental.paymentObligationId), enabled: Boolean(selectedRental?.paymentObligationId) })
  const history = useQuery({ queryKey: ['cadenza', 'rental-payment-history', selectedRentalId], queryFn: () => paymentsApi.history(selectedRental.paymentObligationId), enabled: Boolean(selectedRental?.paymentObligationId) })
  const checkout = useMutation({ mutationFn: ({ id, amount }) => paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza rental payment' }), onSuccess: (response) => { const value = unwrap(response); if (value?.checkoutUrl) window.location.assign(value.checkoutUrl) } })
  const cancel = useMutation({ mutationFn: rentalsApi.cancel, onSuccess: () => { client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }); client.invalidateQueries({ queryKey: ['cadenza', 'rental', selectedRentalId] }) } })

  if (rentals.isLoading) return <LoadingState label="Loading your rentals…" rows={5} />
  if (rentals.error) return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>

  const rows = unwrap(rentals.data).filter((item) => ACTIVE_STATUSES.includes(item.status))
  const filtered = rows.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.status === filter
    const matchesSearch = rentalLabel(item).toLowerCase().includes(search.trim().toLowerCase())
    return matchesFilter && matchesSearch
  })
  const next = [...rows].sort((a, b) => new Date(a.scheduledStart ?? 0) - new Date(b.scheduledStart ?? 0))[0]

  return (
    <div className="space-y-8">
      <PageHeader title="My Rentals" description="Keep track of upcoming bookings, rental dates, and what you still need to pay." />

      {next ? (
        <Card className="overflow-hidden">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge>Next rental</Badge><span className="text-sm text-muted-foreground">{next.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}</span></div>
              <h2 className="mt-2 text-2xl font-semibold">{rentalLabel(next)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(next.scheduledStart).toLocaleString()} – {new Date(next.scheduledEnd).toLocaleString()}</p>
            </div>
            <Button onClick={() => setSelectedRentalId(next.id)}>View details</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Upcoming rentals" value={rows.filter((item) => item.status === 'RESERVED' || item.status === 'PENDING').length} />
        <SummaryCard label="Active rentals" value={rows.filter((item) => item.status === 'ACTIVE').length} />
        <SummaryCard label="Total bookings" value={rows.length} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-medium">Your bookings</p><h2 className="text-xl font-semibold">Upcoming & active</h2></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Input className="sm:w-64" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Search rentals…" /><div className="flex rounded-lg border p-1"><Button size="sm" variant={filter === 'ALL' ? 'default' : 'ghost'} onClick={() => setFilter('ALL')}>All</Button><Button size="sm" variant={filter === 'PENDING' ? 'default' : 'ghost'} onClick={() => setFilter('PENDING')}>Pending</Button><Button size="sm" variant={filter === 'RESERVED' ? 'default' : 'ghost'} onClick={() => setFilter('RESERVED')}>Reserved</Button><Button size="sm" variant={filter === 'ACTIVE' ? 'default' : 'ghost'} onClick={() => setFilter('ACTIVE')}>Active</Button></div></div>
        </div>
        {filtered.length === 0 ? <Card><CardContent className="py-14 text-center"><p className="font-medium">{rows.length ? 'No rentals match your filters' : 'No active or upcoming rentals'}</p><p className="mt-1 text-sm text-muted-foreground">{rows.length ? 'Try another search or status.' : 'Your confirmed bookings will appear here.'}</p></CardContent></Card> :
          <div className="grid gap-4 lg:grid-cols-2">{filtered.map((item) => <RentalCard key={item.id} rental={item} onOpen={() => setSelectedRentalId(item.id)} />)}</div>}
      </section>

      <Dialog open={Boolean(selectedRentalId)} onOpenChange={(open) => !open && setSelectedRentalId(null)}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[1100px]">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14"><DialogTitle>Rental details</DialogTitle><DialogDescription>{selectedRental ? `${rentalLabel(selectedRental)} · ${selectedRental.status}` : 'Loading rental…'}</DialogDescription></DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {selected.isLoading ? <LoadingState label="Loading rental…" rows={3} /> : selectedRental ? <RentalDetails rental={selectedRental} payment={unwrap(payment.data)} history={unwrap(history.data)} historyLoading={history.isLoading} checkout={checkout} cancel={cancel} /> : <p className="text-sm text-muted-foreground">Rental not found.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({ label, value }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>
}

function RentalCard({ rental, onOpen }) {
  const start = rental.scheduledStart ? new Date(rental.scheduledStart) : null
  const end = rental.scheduledEnd ? new Date(rental.scheduledEnd) : null
  const balance = Number(rental.balanceDue ?? rental.outstandingAmount ?? 0)
  return <Card className="transition-shadow hover:shadow-sm"><CardContent className="space-y-5 p-5">
    <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{rentalLabel(rental)}</p><Badge variant={rental.status === 'ACTIVE' ? 'default' : 'secondary'}>{rental.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{rental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}</p></div><p className="text-sm font-medium">{money(rental.totalAmount)}</p></div>
    <div className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Start</p><p className="mt-1 text-sm font-medium">{start?.toLocaleString() ?? '—'}</p></div><div><p className="text-xs text-muted-foreground">End</p><p className="mt-1 text-sm font-medium">{end?.toLocaleString() ?? '—'}</p></div></div>
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-muted-foreground">Booking deposit</p><p className="text-sm font-medium">{money(rental.requiredDownPayment)}</p></div><Button variant="outline" onClick={onOpen}>View rental</Button></div>
  </CardContent></Card>
}

function RentalDetails({ rental, payment, history, historyLoading, checkout, cancel }) {
  const balance = Number(payment?.balanceDue ?? rental.totalAmount ?? 0)
  const paid = Number(payment?.netPaidAmount ?? payment?.paidAmount ?? 0)
  const total = Number(payment?.totalAmount ?? rental.totalAmount ?? 0)
  return <div className="grid gap-6">
    <Card><CardContent className="p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-muted-foreground">Rental</p><h3 className="mt-1 text-2xl font-semibold">{rentalLabel(rental)}</h3><p className="mt-1 text-sm text-muted-foreground">{rental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}</p></div><Badge>{rental.status}</Badge></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Info label="Start" value={rental.scheduledStart ? new Date(rental.scheduledStart).toLocaleString() : '—'} /><Info label="End" value={rental.scheduledEnd ? new Date(rental.scheduledEnd).toLocaleString() : '—'} /><Info label="Booking deposit" value={money(rental.requiredDownPayment)} /></div></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <Card><CardContent className="space-y-4 p-6"><div><p className="font-semibold">Payment summary</p><p className="text-sm text-muted-foreground">Your rental charges and current balance.</p></div><div className="grid gap-3 text-sm"><Row label="Total" value={money(total)} /><Row label="Paid" value={money(paid)} /><Row label="Remaining" value={money(balance)} /></div>{balance > 0 && rental.status !== 'CANCELLED' && <Button className="w-full" onClick={() => checkout.mutate({ id: rental.paymentObligationId, amount: rental.status === 'PENDING' ? rental.requiredDownPayment : balance })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : `Pay ${money(rental.status === 'PENDING' ? rental.requiredDownPayment : balance)} online`}</Button>}</CardContent></Card>
      <Card><CardContent className="space-y-4 p-6"><div><p className="font-semibold">Payment history</p><p className="text-sm text-muted-foreground">Every payment recorded for this rental.</p></div>{historyLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : history.length ? <div className="divide-y">{history.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{entry.method ?? entry.provider ?? 'Payment'}</p><p className="text-xs text-muted-foreground">{entry.status}</p></div><span className="font-medium">{money(entry.amount)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</CardContent></Card>
    </div>
    {['PENDING', 'RESERVED'].includes(rental.status) && <Button variant="outline" className="w-fit" onClick={() => cancel.mutate(rental.id)} disabled={cancel.isPending || paid > 0}>{cancel.isPending ? 'Cancelling…' : 'Cancel booking'}</Button>}
  </div>
}

function Info({ label, value }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div> }
function Row({ label, value }) { return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div> }
