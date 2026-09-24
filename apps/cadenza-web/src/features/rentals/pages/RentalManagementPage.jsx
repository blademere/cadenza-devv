import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { rentalsApi } from '../api/rentals.api'
import { formatCurrency } from '../../../utils/currency'

const unwrap = (value) => value?.data ?? value ?? []
const money = (value) => formatCurrency(Number(value ?? 0))

export default function RentalManagementPage() {
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  const rows = useMemo(() => unwrap(rentals.data), [rentals.data])

  if (rentals.isLoading) return <LoadingState label="Loading rental operations…" rows={5} />
  if (rentals.error) return <p className="text-sm text-destructive">{rentals.error.message}</p>

  const pending = rows.filter((r) => r.status === 'PENDING')
  const reserved = rows.filter((r) => r.status === 'RESERVED')
  const active = rows.filter((r) => r.status === 'CHECKED_OUT' || r.status === 'ACTIVE')
  const returned = rows.filter((r) => r.status === 'RETURNED')
  const outstanding = rows.reduce((sum, r) => sum + Number(r.balanceDue ?? r.outstandingAmount ?? 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rental Operations"
        description="Run each rental workflow from its own focused workspace instead of managing booking, checkout, return, and payment work on one screen."
        actions={<Button asChild><Link to="/app/rental-bookings">Open bookings</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Needs booking" value={pending.length} />
        <Metric label="Reserved / ready" value={reserved.length} />
        <Metric label="Checked out" value={active.length} />
        <Metric label="Returned" value={returned.length} />
        <Metric label="Outstanding" value={money(outstanding)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowCard title="Bookings" description="Review new rental requests and reservations." count={pending.length} href="/app/rental-bookings" action="Open bookings" rows={pending.slice(0, 5)} badge="PENDING" />
        <WorkflowCard title="Checkout" description="Prepare reserved rentals and hand resources to customers." count={reserved.length} href="/app/rental-checkout" action="Open checkout" rows={reserved.slice(0, 5)} badge="RESERVED" />
        <WorkflowCard title="Returns" description="Process active rentals that are coming back." count={active.length} href="/app/rental-returns" action="Open returns" rows={active.slice(0, 5)} badge="CHECKED_OUT" />
        <WorkflowCard title="Payments" description="Collect deposits and remaining balances without mixing them into operations." count={rows.filter((r) => !['CANCELLED', 'RETURNED'].includes(r.status) && Number(r.balanceDue ?? r.outstandingAmount ?? 0) > 0).length} href="/app/rental-payments" action="Open payments" rows={rows.filter((r) => !['CANCELLED', 'RETURNED'].includes(r.status)).slice(0, 5)} badge="BALANCE" />
      </div>
      <Card>
        <CardHeader><CardTitle>Rental lifecycle</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['1', 'Booking', '/app/rental-bookings', 'Request → reservation'],
              ['2', 'Checkout', '/app/rental-checkout', 'Reserved → checked out'],
              ['3', 'Return', '/app/rental-returns', 'Checked out → returned'],
              ['4', 'Payment', '/app/rental-payments', 'Deposit → balance → settled'],
            ].map(([number, title, href, description]) => (
              <Link key={href} to={href} className="rounded-xl border p-4 transition-colors hover:bg-muted/50">
                <span className="text-xs text-muted-foreground">{number}</span>
                <p className="mt-1 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>
}

function WorkflowCard({ title, description, count, href, action, rows, badge }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle>{title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{r.resource?.name || (r.rentalType === 'ROOM' ? 'Band room' : 'Instrument')}</p><p className="text-xs text-muted-foreground">{r.scheduledStart ? new Date(r.scheduledStart).toLocaleString() : 'No schedule'}</p></div>
            <Badge variant="outline">{badge}</Badge>
          </div>
        )) : <p className="py-4 text-sm text-muted-foreground">Nothing needs attention here.</p>}
        <Button variant="outline" className="w-full" asChild><Link to={href}>{action}</Link></Button>
      </CardContent>
    </Card>
  )
}
