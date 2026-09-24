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
const date = (value) => value ? new Date(value).toLocaleString() : '—'

export default function ResourceAuditPage() {
  const { can } = useAuthorization()
  const allowed = can('audit_logs:read')
  const [resourceId, setResourceId] = useState('ALL')
  const [action, setAction] = useState('ALL')
  const instruments = useQuery({ queryKey: ['cadenza', 'audit', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: allowed })
  const rooms = useQuery({ queryKey: ['cadenza', 'audit', 'rooms'], queryFn: resourcesApi.listRooms, enabled: allowed })
  const audit = useQuery({
    queryKey: ['cadenza', 'resource-audit', resourceId, action],
    queryFn: () => resourcesApi.getAudit({ ...(resourceId !== 'ALL' ? { entityId: resourceId } : {}), ...(action !== 'ALL' ? { action } : {}) }),
    enabled: allowed,
  })

  const resources = useMemo(() => [
    ...unwrap(instruments.data).map((x) => ({ id: x.resourceId, name: x.resource?.name ?? x.name ?? x.resourceId, type: 'Instrument' })),
    ...unwrap(rooms.data).map((x) => ({ id: x.resourceId, name: x.resource?.name ?? x.name ?? x.resourceId, type: 'Band room' })),
  ].filter((x) => x.id), [instruments.data, rooms.data])

  if (!allowed) return <Alert variant="destructive"><AlertDescription>You do not have permission to view resource audit logs.</AlertDescription></Alert>
  if (instruments.isLoading || rooms.isLoading || audit.isLoading) return <LoadingState label="Loading resource audit trail…" rows={6} />
  if (instruments.error || rooms.error || audit.error) return <Alert variant="destructive"><AlertDescription>{(instruments.error || rooms.error || audit.error).message}</AlertDescription></Alert>

  const result = audit.data?.data ?? audit.data ?? []
  const rows = Array.isArray(result) ? result : result.data ?? []
  const actions = Array.from(new Set(rows.map((row) => row.action).filter(Boolean)))
  const resourceName = (id) => resources.find((x) => String(x.id) === String(id))?.name ?? id ?? '—'

  return <div className="grid gap-6">
    <PageHeader title="Audit Trail" description="Review who changed resources, what changed, and when. Audit entries are historical records, not editable data." />
    <Card><CardContent className="pt-6 grid gap-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <SelectField label="Resource" options={[{ value: 'ALL', label: 'All resources' }, ...resources.map((x) => ({ value: x.id, label: `${x.name} · ${x.type}` }))]} value={resourceId} onChange={(value) => setResourceId(value || 'ALL')} />
        <SelectField label="Action" options={[{ value: 'ALL', label: 'All actions' }, ...actions.map((x) => ({ value: x, label: x }))]} value={action} onChange={(value) => setAction(value || 'ALL')} />
      </div>
      <DataTable columns={[
        { key: 'createdAt', header: 'Time', value: (row) => date(row.createdAt) },
        { key: 'action', header: 'Action', render: (row) => <Badge variant="secondary">{row.action || '—'}</Badge> },
        { key: 'entityId', header: 'Resource', value: (row) => resourceName(row.entityId) },
        { key: 'actor', header: 'Changed by', value: (row) => row.actor?.email ?? row.actorId ?? 'System' },
        { key: 'details', header: 'Details', value: (row) => row.metadata?.reason ?? row.reason ?? row.message ?? 'Change recorded' },
      ]} rows={rows} searchPlaceholder="Search audit history…" emptyMessage="No resource changes match the filters." />
    </CardContent></Card>
  </div>
}