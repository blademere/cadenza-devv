import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import SelectField from '../../../components/select-field'
import { resourcesApi } from '../api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const money = (value) => value == null ? '—' : `PHP ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const date = (value) => value ? new Date(value).toLocaleString() : '—'

export default function ResourceUsageHistoryPage() {
  const { can } = useAuthorization()
  const allowed = can('cadenza_rentals:manage')
  const instruments = useQuery({ queryKey: ['cadenza', 'resources', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: allowed })
  const rooms = useQuery({ queryKey: ['cadenza', 'resources', 'rooms'], queryFn: resourcesApi.listRooms, enabled: allowed })
  const [resourceId, setResourceId] = useState('')
  const [status, setStatus] = useState('ALL')
  const [period, setPeriod] = useState('ALL')
  const resources = useMemo(() => [
    ...unwrap(instruments.data).map((x) => ({ id: x.resourceId, name: x.resource?.name ?? x.name ?? x.resourceId, type: 'Instrument' })),
    ...unwrap(rooms.data).map((x) => ({ id: x.resourceId, name: x.resource?.name ?? x.name ?? x.resourceId, type: 'Band room' })),
  ].filter((x) => x.id), [instruments.data, rooms.data])

  const usage = useQuery({
    queryKey: ['cadenza', 'resource-usage', resourceId],
    queryFn: () => resourcesApi.getUsage(resourceId),
    enabled: allowed && Boolean(resourceId),
  })

  if (!allowed) return <Alert variant="destructive"><AlertDescription>You are not authorized to view resource usage history.</AlertDescription></Alert>
  if (instruments.isLoading || rooms.isLoading) return <LoadingState label="Loading resource history…" rows={5} />
  if (instruments.error || rooms.error) return <Alert variant="destructive"><AlertDescription>{(instruments.error || rooms.error).message}</AlertDescription></Alert>

  const result = usage.data?.data ?? usage.data ?? { data: [] }
  const rows = (Array.isArray(result) ? result : result.data ?? []).filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false
    if (period === 'ALL' || !row.scheduledStart) return true
    const days = period === '30D' ? 30 : 90
    return new Date(row.scheduledStart) >= new Date(Date.now() - days * 86400000)
  })
  const summary = Array.isArray(result) ? null : result.summary
  const selected = resources.find((x) => x.id === resourceId)

  return <div className="grid gap-6">
    <PageHeader title="Usage History" description="See how each instrument or band room is being booked, used, returned, and earning." />
    <Card><CardContent className="pt-6 grid gap-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <SelectField label="Resource" options={resources.map((x) => ({ value: x.id, label: `${x.name} · ${x.type}` }))} value={resourceId} onChange={(value) => setResourceId(value || '')} placeholder="Select a resource" />
        <SelectField label="Period" options={[{ value: 'ALL', label: 'All time' }, { value: '30D', label: 'Last 30 days' }, { value: '90D', label: 'Last 90 days' }]} value={period} onChange={(value) => setPeriod(value || 'ALL')} />
        <SelectField label="Status" options={[{ value: 'ALL', label: 'All statuses' }, ...Array.from(new Set((Array.isArray(result) ? result : result.data ?? []).map((x) => x.status).filter(Boolean))).map((x) => ({ value: x, label: x }))]} value={status} onChange={(value) => setStatus(value || 'ALL')} />
      </div>

      {!resourceId && <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">Choose a resource to inspect its history</p><p className="mt-1 text-sm text-muted-foreground">You’ll see bookings, checkout/return timestamps, customer activity, hours, and revenue.</p></div>}
      {usage.isLoading && <LoadingState label="Loading usage history…" rows={5} />}
      {usage.error && <Alert variant="destructive"><AlertDescription>{usage.error.message}</AlertDescription></Alert>}
      {resourceId && !usage.isLoading && !usage.error && <DataTable columns={[
        { key: 'scheduledStart', header: 'Schedule', value: (row) => row.scheduledStart ? `${date(row.scheduledStart)} → ${date(row.scheduledEnd)}` : '—' },
        { key: 'customer', header: 'Customer', value: (row) => row.customer?.person?.name ?? row.customer?.person?.fullName ?? row.customer?.person?.email ?? row.customerId ?? '—' },
        { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'RETURNED' ? 'default' : 'secondary'}>{row.status}</Badge> },
        { key: 'checkedOutAt', header: 'Checkout', value: (row) => date(row.checkedOutAt) },
        { key: 'returnedAt', header: 'Return', value: (row) => date(row.returnedAt) },
        { key: 'amount', header: 'Revenue', value: (row) => money(row.totalAmount) },
      ]} rows={rows} searchPlaceholder="Search this resource’s usage…" emptyMessage="No usage matches the selected filters." />}
      {summary && resourceId && <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Bookings</div><div className="mt-1 text-2xl font-semibold">{summary.bookings ?? 0}</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Completed</div><div className="mt-1 text-2xl font-semibold">{summary.completed ?? 0}</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Hours</div><div className="mt-1 text-2xl font-semibold">{summary.hours ?? 0}</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Revenue</div><div className="mt-1 text-2xl font-semibold">{money(summary.revenue)}</div></div>
      </div>}
    </CardContent></Card>
  </div>
}