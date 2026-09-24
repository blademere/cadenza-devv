import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import SelectField from '../../../components/select-field'
import { resourcesApi } from '../api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []

export default function ResourceUsageHistoryPage() {
  const { can } = useAuthorization()
  const allowed = can('cadenza_rentals:manage')
  const instruments = useQuery({ queryKey: ['cadenza', 'resources', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: allowed })
  const rooms = useQuery({ queryKey: ['cadenza', 'resources', 'rooms'], queryFn: resourcesApi.listRooms, enabled: allowed })
  const [resourceId, setResourceId] = useState('')
  const resources = useMemo(() => [
    ...unwrap(instruments.data).map((x) => ({ id: x.resourceId, name: x.resource?.name ?? x.name ?? x.resourceId, type: 'Instrument' })),
    ...unwrap(rooms.data).map((x) => ({ id: x.resourceId, name: x.resource?.name ?? x.name ?? x.resourceId, type: 'Band room' })),
  ].filter((x) => x.id), [instruments.data, rooms.data])
  const usage = useQuery({ queryKey: ['cadenza', 'resource-usage', resourceId], queryFn: () => resourcesApi.getUsage(resourceId), enabled: allowed && Boolean(resourceId) })
  if (!allowed) return <Alert variant="destructive"><AlertDescription>You are not authorized to view resource usage history.</AlertDescription></Alert>
  if (instruments.isLoading || rooms.isLoading) return <LoadingState label="Loading resources…" rows={4} />
  if (instruments.error || rooms.error) return <Alert variant="destructive"><AlertDescription>{(instruments.error || rooms.error).message}</AlertDescription></Alert>
  const result = usage.data?.data ?? usage.data ?? { data: [] }
  const rows = Array.isArray(result) ? result : result.data ?? []
  const summary = Array.isArray(result) ? null : result.summary
  return <div className="grid gap-6">
    <PageHeader title="Resource Usage History" description="Review every rental booking, checkout, and return associated with a resource." />
    <Card><CardContent className="pt-6 grid gap-5">
      <SelectField label="Resource" options={resources.map((x) => ({ value: x.id, label: `${x.name} · ${x.type}` }))} value={resourceId} onChange={(value) => setResourceId(value || '')} placeholder="Select a resource" />
      {usage.isLoading && <LoadingState label="Loading usage history…" rows={5} />}
      {usage.error && <Alert variant="destructive"><AlertDescription>{usage.error.message}</AlertDescription></Alert>}
      {resourceId && !usage.isLoading && !usage.error && <DataTable columns={[
        { key: 'scheduledStart', header: 'Scheduled', value: (row) => row.scheduledStart ? new Date(row.scheduledStart).toLocaleString() : '—' },
        { key: 'customer', header: 'Customer', value: (row) => row.customer?.person?.name ?? row.customer?.person?.fullName ?? row.customer?.person?.email ?? row.customerId ?? '—' },
        { key: 'status', header: 'Status', render: (row) => <Badge variant="secondary">{row.status}</Badge> },
        { key: 'checkedOutAt', header: 'Checked out', value: (row) => row.checkedOutAt ? new Date(row.checkedOutAt).toLocaleString() : '—' },
        { key: 'returnedAt', header: 'Returned', value: (row) => row.returnedAt ? new Date(row.returnedAt).toLocaleString() : '—' },
        { key: 'amount', header: 'Amount', value: (row) => row.totalAmount != null ? `PHP ${Number(row.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—' },
      ]} rows={rows} searchPlaceholder="Search usage history…" />}
      {summary && resourceId && <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Bookings</div><div className="text-xl font-semibold">{summary.bookings}</div></div>
        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Completed</div><div className="text-xl font-semibold">{summary.completed}</div></div>
        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Hours</div><div className="text-xl font-semibold">{summary.hours}</div></div>
        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Revenue</div><div className="text-xl font-semibold">PHP {Number(summary.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
      </div>}
    </CardContent></Card>
  </div>
}