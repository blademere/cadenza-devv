import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import SelectField from '../../../components/select-field'
import { resourcesApi } from '../api/resources.api'
import { rentalsApi } from '../../rentals/api/rentals.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const money = (value) => value == null ? '—' : `PHP ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const date = (value) => value ? new Date(value).toLocaleString() : '—'
const customerName = (row) => [row.customer?.person?.firstName, row.customer?.person?.middleName, row.customer?.person?.lastName, row.customer?.person?.suffix].filter(Boolean).join(' ') || row.customer?.person?.email || row.customerId || '—'
const resourceName = (row) => row.resource?.name || row.resource?.key || (row.rentalType === 'ROOM' ? 'Band room' : 'Instrument')
const statusLabel = (status) => ({ PENDING: 'Booking', RESERVED: 'Reserved', CHECKED_OUT: 'Checked out', ACTIVE: 'Checked out', RETURNED: 'Returned', CANCELLED: 'Cancelled' }[status] || status || '—')

export default function ResourceUsageHistoryPage() {
  const { can } = useAuthorization()
  const allowed = can('cadenza_rentals:manage')
  const instruments = useQuery({ queryKey: ['cadenza', 'resources', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: allowed })
  const rooms = useQuery({ queryKey: ['cadenza', 'resources', 'rooms'], queryFn: resourcesApi.listRooms, enabled: allowed })
  const [resourceId, setResourceId] = useState('')
  const [status, setStatus] = useState('ALL')
  const [period, setPeriod] = useState('ALL')
  const [selectedUsageId, setSelectedUsageId] = useState(null)

  const resources = useMemo(() => [
    ...unwrap(instruments.data).map((x) => ({ id: x.resourceId, name: x.resource?.name || x.name || 'Unnamed resource', type: 'Instrument' })),
    ...unwrap(rooms.data).map((x) => ({ id: x.resourceId, name: x.resource?.name || x.name || x.resourceId, type: 'Band room' })),
  ].filter((x) => x.id), [instruments.data, rooms.data])

  const usage = useQuery({
    queryKey: ['cadenza', 'resource-usage', resourceId || 'ALL'],
    queryFn: () => resourcesApi.getUsage(resourceId),
    enabled: allowed,
  })

  const detail = useQuery({
    queryKey: ['cadenza', 'rental', selectedUsageId],
    queryFn: () => rentalsApi.get(selectedUsageId),
    enabled: Boolean(selectedUsageId),
  })

  if (!allowed) return <Alert variant="destructive"><AlertDescription>You are not authorized to view resource usage history.</AlertDescription></Alert>
  if (instruments.isLoading || rooms.isLoading) return <LoadingState label="Loading resource history…" rows={5} />
  if (instruments.error || rooms.error) return <Alert variant="destructive"><AlertDescription>{(instruments.error || rooms.error).message}</AlertDescription></Alert>

  const result = usage.data?.data ?? usage.data ?? { data: [] }
  const sourceRows = Array.isArray(result) ? result : result.data ?? []
  const rows = sourceRows.filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false
    if (period === 'ALL' || !row.scheduledStart) return true
    const days = period === '30D' ? 30 : 90
    return new Date(row.scheduledStart) >= new Date(Date.now() - days * 86400000)
  })
  const summary = Array.isArray(result) ? null : result.summary

  return <div className="grid gap-6">
    <PageHeader title="Usage History" description="Review every instrument and band-room rental, with filters for resource, period, and status." />
    <Card>
      <CardHeader>
        <CardTitle>Resource usage</CardTitle>
        <p className="text-sm text-muted-foreground">Leave Resource set to All resources to see the complete usage history.</p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <SelectField label="Resource" options={[{ value: '', label: 'All resources' }, ...resources.map((x) => ({ value: x.id, label: `${x.name} · ${x.type}` }))]} value={resourceId} onChange={(value) => setResourceId(value || '')} placeholder="All resources" />
          <SelectField label="Period" options={[{ value: 'ALL', label: 'All time' }, { value: '30D', label: 'Last 30 days' }, { value: '90D', label: 'Last 90 days' }]} value={period} onChange={(value) => setPeriod(value || 'ALL')} />
          <SelectField label="Status" options={[{ value: 'ALL', label: 'All statuses' }, ...Array.from(new Set(sourceRows.map((x) => x.status).filter(Boolean))).map((x) => ({ value: x, label: statusLabel(x) }))]} value={status} onChange={(value) => setStatus(value || 'ALL')} />
        </div>

        {usage.isLoading && <LoadingState label="Loading usage history…" rows={5} />}
        {usage.error && <Alert variant="destructive"><AlertDescription>{usage.error.message}</AlertDescription></Alert>}
        {!usage.isLoading && !usage.error && <DataTable
          columns={[
            { key: 'resource', header: 'Resource', value: resourceName },
            { key: 'customer', header: 'Customer', value: customerName },
            { key: 'scheduledStart', header: 'Schedule', value: (row) => row.scheduledStart ? `${date(row.scheduledStart)} → ${date(row.scheduledEnd)}` : '—' },
            { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'RETURNED' ? 'default' : 'secondary'}>{statusLabel(row.status)}</Badge> },
            { key: 'checkedOutAt', header: 'Checkout', value: (row) => date(row.checkedOutAt) },
            { key: 'returnedAt', header: 'Return', value: (row) => date(row.returnedAt) },
            { key: 'amount', header: 'Revenue', value: (row) => money(row.totalAmount) },
            { key: 'action', header: 'Action', searchable: false, render: (row) => <Button size="sm" variant="outline" onClick={() => setSelectedUsageId(row.id)}>Open details</Button> },
          ]}
          rows={rows}
          searchPlaceholder="Search usage history…"
          emptyMessage="No usage matches the selected filters."
        />}

        {summary && <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Bookings</div><div className="mt-1 text-2xl font-semibold">{summary.bookings ?? 0}</div></div>
          <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Completed</div><div className="mt-1 text-2xl font-semibold">{summary.completed ?? 0}</div></div>
          <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Hours</div><div className="mt-1 text-2xl font-semibold">{summary.hours ?? 0}</div></div>
          <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Revenue</div><div className="mt-1 text-2xl font-semibold">{money(summary.revenue)}</div></div>
        </div>}
      </CardContent>
    </Card>

    <Dialog open={Boolean(selectedUsageId)} onOpenChange={(open) => !open && setSelectedUsageId(null)}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[900px]">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
          <DialogTitle>{detail.data ? resourceName(unwrap(detail.data)) : 'Rental details'}</DialogTitle>
          <DialogDescription>{detail.data ? `${customerName(unwrap(detail.data))} · ${statusLabel(unwrap(detail.data).status)}` : 'Loading full rental details…'}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {detail.isLoading && <LoadingState label="Loading rental details…" rows={4} />}
          {detail.error && <Alert variant="destructive"><AlertDescription>{detail.error.message}</AlertDescription></Alert>}
          {!detail.isLoading && !detail.error && unwrap(detail.data) && <RentalDetails rental={unwrap(detail.data)} />}
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4"><Button variant="outline" onClick={() => setSelectedUsageId(null)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

function RentalDetails({ rental }) {
  return <div className="grid gap-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <DetailStat label="Status" value={statusLabel(rental.status)} />
      <DetailStat label="Rental type" value={rental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'} />
      <DetailStat label="Total" value={money(rental.totalAmount)} />
      <DetailStat label="Balance due" value={money(rental.balanceDue ?? rental.outstandingAmount)} />
    </div>
    <Card><CardHeader><CardTitle className="text-base">Booking details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2">
      <Row label="Rental ID" value={rental.id} />
      <Row label="Customer" value={customerName(rental)} />
      <Row label="Resource" value={resourceName(rental)} />
      <Row label="Scheduled start" value={date(rental.scheduledStart)} />
      <Row label="Scheduled end" value={date(rental.scheduledEnd)} />
      <Row label="Checked out" value={date(rental.checkedOutAt)} />
      <Row label="Returned" value={date(rental.returnedAt)} />
      <Row label="Created" value={date(rental.createdAt)} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2">
      <Row label="Total amount" value={money(rental.totalAmount)} />
      <Row label="Required down payment" value={money(rental.requiredDownPayment)} />
      <Row label="Paid" value={money(rental.payment?.netPaidAmount ?? rental.payment?.paidAmount)} />
      <Row label="Balance due" value={money(rental.payment?.balanceDue ?? rental.balanceDue ?? rental.outstandingAmount)} />
    </CardContent></Card>
  </div>
}

function DetailStat({ label, value }) {
  return <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}

function Row({ label, value }) {
  return <div className="flex justify-between gap-4 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="max-w-[65%] text-right font-medium break-words">{value ?? '—'}</span></div>
}
