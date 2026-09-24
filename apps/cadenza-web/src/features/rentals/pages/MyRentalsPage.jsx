import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (value) => value?.data ?? value ?? []

export default function MyRentalsPage() {
  const client = useQueryClient()
  const [selectedRentalId, setSelectedRentalId] = useState(null)
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const selected = useQuery({ queryKey: ['cadenza', 'rental', selectedRentalId], queryFn: () => rentalsApi.get(selectedRentalId), enabled: Boolean(selectedRentalId) })
  const selectedRental = unwrap(selected.data)
  const payment = useQuery({ queryKey: ['cadenza', 'rental-payment', selectedRentalId], queryFn: () => paymentsApi.get(selectedRental.paymentObligationId), enabled: Boolean(selectedRental?.paymentObligationId) })
  const history = useQuery({ queryKey: ['cadenza', 'rental-payment-history', selectedRentalId], queryFn: () => paymentsApi.history(selectedRental.paymentObligationId), enabled: Boolean(selectedRental?.paymentObligationId) })
  const checkout = useMutation({ mutationFn: ({ id, amount }) => paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza rental payment' }), onSuccess: (response) => { const value = unwrap(response); if (value?.checkoutUrl) window.location.assign(value.checkoutUrl) } })
  const cancel = useMutation({ mutationFn: rentalsApi.cancel, onSuccess: () => { client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }); client.invalidateQueries({ queryKey: ['cadenza', 'rental', selectedRentalId] }) } })

  if (rentals.isLoading) return <LoadingState label="Loading your rentals…" rows={5} />
  if (rentals.error) return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>

  const active = unwrap(rentals.data).filter((item) => !['COMPLETED', 'RETURNED', 'CANCELLED'].includes(item.status))
  return (
    <div className="space-y-6">
      <PageHeader title="My Rentals" description="Manage upcoming rentals, balances, and rental details." />
      {active.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">You have no active or upcoming rentals.</CardContent></Card> :
        <div className="grid gap-3">{active.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.resource?.name ?? (item.rentalType === 'ROOM' ? 'Band room' : 'Instrument')}</p><Badge variant="secondary">{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{new Date(item.scheduledStart).toLocaleString()} – {new Date(item.scheduledEnd).toLocaleString()}</p></div><Button size="sm" variant="outline" onClick={() => setSelectedRentalId(item.id)}>View rental</Button></CardContent></Card>)}</div>}
      <Dialog open={Boolean(selectedRentalId)} onOpenChange={(open) => !open && setSelectedRentalId(null)}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[1100px]">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14"><DialogTitle>Rental details</DialogTitle><DialogDescription>{selectedRental ? `${selectedRental.resource?.name ?? 'Rental'} · ${selectedRental.status}` : 'Loading rental…'}</DialogDescription></DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {selected.isLoading ? <LoadingState label="Loading rental…" rows={3} /> : selectedRental ? <RentalDetails rental={selectedRental} payment={unwrap(payment.data)} history={unwrap(history.data)} historyLoading={history.isLoading} checkout={checkout} cancel={cancel} /> : <p className="text-sm text-muted-foreground">Rental not found.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RentalDetails({ rental, payment, history, historyLoading, checkout, cancel }) {
  const balance = Number(payment?.balanceDue ?? rental.totalAmount ?? 0)
  const paid = Number(payment?.netPaidAmount ?? payment?.paidAmount ?? 0)
  return <div className="grid gap-6"><div className="grid gap-4 lg:grid-cols-2"><Card><CardContent className="grid gap-3 p-5 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{rental.status}</Badge></div><div className="flex justify-between"><span className="text-muted-foreground">Resource</span><span>{rental.resource?.name ?? rental.resourceId}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Start</span><span>{new Date(rental.scheduledStart).toLocaleString()}</span></div><div className="flex justify-between"><span className="text-muted-foreground">End</span><span>{new Date(rental.scheduledEnd).toLocaleString()}</span></div></CardContent></Card><Card><CardContent className="grid gap-3 p-5 text-sm"><div className="flex justify-between"><span>Total</span><span>{formatCurrency(payment?.totalAmount ?? rental.totalAmount)}</span></div><div className="flex justify-between"><span>Deposit</span><span>{formatCurrency(rental.requiredDownPayment)}</span></div><div className="flex justify-between font-semibold"><span>Balance</span><span>{formatCurrency(balance)}</span></div>{balance > 0 && rental.status !== 'CANCELLED' && <Button onClick={() => checkout.mutate({ id: rental.paymentObligationId, amount: rental.status === 'PENDING' ? rental.requiredDownPayment : balance })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : 'Pay online'}</Button>}</CardContent></Card></div><Card><CardContent className="space-y-2 p-5"><p className="font-medium">Payment history</p>{historyLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : history.length ? history.map((entry) => <div key={entry.id} className="flex justify-between border-b py-2 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</CardContent></Card>{['PENDING','RESERVED'].includes(rental.status) && <Button variant="outline" className="w-fit" onClick={() => cancel.mutate(rental.id)} disabled={cancel.isPending || paid > 0}>{cancel.isPending ? 'Cancelling…' : 'Cancel booking'}</Button>}</div>
}
