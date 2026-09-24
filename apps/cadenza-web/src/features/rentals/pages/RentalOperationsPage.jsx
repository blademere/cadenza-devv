import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (value) => value?.data ?? value ?? []
const nameOf = (r) => r.customer?.person?.firstName || r.customer?.person?.email || r.customerId || 'Customer'
const resourceOf = (r) => r.resource?.name || (r.rentalType === 'ROOM' ? 'Band room' : 'Instrument')
const statusLabel = (s) => ({ PENDING: 'Booking', RESERVED: 'Reserved', CHECKED_OUT: 'Checked out', ACTIVE: 'Checked out', RETURNED: 'Returned', CANCELLED: 'Cancelled' }[s] || s)

const CONFIG = {
  bookings: { title: 'Rental Bookings', description: 'Review new bookings and reservations before they move to checkout.', statuses: ['PENDING', 'RESERVED'] },
  checkout: { title: 'Rental Checkout', description: 'Prepare reserved rentals and record the handover to the customer.', statuses: ['RESERVED'] },
  returns: { title: 'Rental Returns', description: 'Process active rentals as resources come back and close the rental lifecycle.', statuses: ['CHECKED_OUT', 'ACTIVE'] },
  payments: { title: 'Rental Payments', description: 'Collect booking deposits and remaining balances while keeping payment work separate from rental operations.', statuses: ['PENDING', 'RESERVED', 'CHECKED_OUT', 'ACTIVE'] },
}

export default function RentalOperationsPage({ mode = 'bookings' }) {
  const config = CONFIG[mode] || CONFIG.bookings
  const client = useQueryClient()
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

  if (rentals.isLoading) return <LoadingState label="Loading rental workflow…" rows={6} />
  if (rentals.error) return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>

  const rows = unwrap(rentals.data).filter((r) => config.statuses.includes(r.status))
  const detailError = selected.error || payment.error || history.error || lifecycle.error || pay.error
  const obligation = selectedRental?.payment ?? unwrap(payment.data)
  const balance = Number(obligation?.balanceDue ?? selectedRental?.balanceDue ?? selectedRental?.outstandingAmount ?? 0)

  const workflowAction = mode === 'checkout'
    ? { label: 'Check out rental', action: 'checkout', allowed: selectedRental?.status === 'RESERVED' }
    : mode === 'returns'
      ? { label: 'Mark returned', action: 'returnRental', allowed: selectedRental?.status === 'CHECKED_OUT' || selectedRental?.status === 'ACTIVE' }
      : null

  return (
    <div className="space-y-8">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={<Button variant="outline" asChild><Link to="/app/rentals">Overview</Link></Button>}
      />
      {detailError && <Alert variant="destructive"><AlertDescription>{detailError.message}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>{mode === 'payments' ? 'Outstanding rental balances' : mode === 'checkout' ? 'Ready for checkout' : mode === 'returns' ? 'Active rentals to return' : 'Bookings in this workflow'}</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            searchPlaceholder={mode === 'payments' ? 'Search customer, resource, or rental…' : 'Search rentals…'}
            emptyMessage={mode === 'payments' ? 'No outstanding rentals.' : 'No rentals currently need action.'}
            columns={[
              { key: 'customer', header: 'Customer', value: nameOf },
              { key: 'resource', header: 'Rental', value: resourceOf },
              { key: 'schedule', header: 'Schedule', value: (r) => r.scheduledStart ? new Date(r.scheduledStart).toLocaleString() : '—' },
              { key: 'status', header: 'Stage', render: (r) => <Badge variant="secondary">{statusLabel(r.status)}</Badge> },
              { key: 'amount', header: mode === 'payments' ? 'Balance' : 'Total', value: (r) => formatCurrency(mode === 'payments' ? (r.balanceDue ?? r.outstandingAmount ?? 0) : r.totalAmount) },
              { key: 'action', header: 'Action', searchable: false, render: (r) => <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>Open</Button> },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[1100px]">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
            <DialogTitle>{selectedRental ? resourceOf(selectedRental) : 'Rental details'}</DialogTitle>
            <DialogDescription>{selectedRental ? nameOf(selectedRental) + ' · ' + statusLabel(selectedRental.status) : 'Loading rental…'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {selected.isLoading ? <LoadingState label="Loading rental…" rows={3} /> : selectedRental ? (
              <div className="grid gap-6">
                <div className="grid gap-3 md:grid-cols-4">
                  {['Booking', 'Reserved', 'Checked out', 'Returned'].map((step, i) => {
                    const current = selectedRental.status === 'PENDING' ? 0 : selectedRental.status === 'RESERVED' ? 1 : ['CHECKED_OUT', 'ACTIVE'].includes(selectedRental.status) ? 2 : selectedRental.status === 'RETURNED' ? 3 : -1
                    return <div key={step} className={current >= i ? 'rounded-lg border p-3 bg-muted' : 'rounded-lg border p-3'}><p className="text-sm font-medium">{i + 1}. {step}</p>{current === i && <p className="mt-1 text-xs text-muted-foreground">Current stage</p>}</div>
                  })}
                </div>
                <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
                  <Card><CardHeader><CardTitle className="text-base">Rental details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
                    <Row label="Customer" value={nameOf(selectedRental)} />
                    <Row label="Resource" value={resourceOf(selectedRental)} />
                    <Row label="Type" value={selectedRental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'} />
                    <Row label="Start" value={selectedRental.scheduledStart ? new Date(selectedRental.scheduledStart).toLocaleString() : '—'} />
                    <Row label="End" value={selectedRental.scheduledEnd ? new Date(selectedRental.scheduledEnd).toLocaleString() : '—'} />
                    <Row label="Status" value={statusLabel(selectedRental.status)} />
                  </CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
                    <Row label="Total" value={formatCurrency(obligation?.totalAmount ?? selectedRental.totalAmount)} />
                    <Row label="Deposit" value={formatCurrency(selectedRental.requiredDownPayment)} />
                    <Row label="Paid" value={formatCurrency(obligation?.netPaidAmount ?? obligation?.paidAmount)} />
                    <Row label="Balance" value={formatCurrency(balance)} />
                  </CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle className="text-base">Workflow action</CardTitle></CardHeader><CardContent className="space-y-4">
                  {workflowAction?.allowed && <Button onClick={() => lifecycle.mutate({ action: workflowAction.action, id: selectedRental.id })} disabled={lifecycle.isPending}>{lifecycle.isPending ? 'Saving…' : workflowAction.label}</Button>}
                  {mode === 'bookings' && selectedRental.status === 'PENDING' && <div className="flex gap-2"><Badge variant="outline">Awaiting booking confirmation</Badge><Button variant="destructive" onClick={() => lifecycle.mutate({ action: 'cancel', id: selectedRental.id })} disabled={lifecycle.isPending}>Cancel</Button></div>}
                  {mode === 'bookings' && selectedRental.status === 'RESERVED' && <div className="flex gap-2"><Badge variant="secondary">Ready for checkout</Badge><Button asChild><Link to="/app/rental-checkout">Send to checkout</Link></Button></div>}
                  {mode === 'payments' && selectedRental.paymentObligationId && balance > 0 && <div className="flex flex-wrap gap-3"><Input className="w-48" type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.currentTarget.value)} /><Button onClick={() => pay.mutate({ id: selectedRental.paymentObligationId, value: amount })} disabled={!amount || pay.isPending}>{pay.isPending ? 'Recording…' : 'Record cash payment'}</Button></div>}
                  {mode === 'returns' && selectedRental.status === 'CHECKED_OUT' && balance > 0 && <p className="text-sm text-destructive">Collect the remaining balance before completing the return.</p>}
                  {mode === 'returns' && selectedRental.status === 'CHECKED_OUT' && balance <= 0 && <Badge>Payment settled — ready to return</Badge>}
                </CardContent></Card>
                {mode === 'payments' && <Card><CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader><CardContent>{history.isLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : unwrap(history.data).length ? <div className="divide-y">{unwrap(history.data).map((entry) => <div key={entry.id} className="flex justify-between py-3 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</CardContent></Card>}
              </div>
            ) : <p className="text-sm text-muted-foreground">Rental not found.</p>}
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4"><Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between gap-4 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>
}
