import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import { Input } from '../../../components/ui/input'
import LoadingState from '../../../components/loading-state'
import { apiClient } from '../../services/api/client'
import { useAuthorization } from '../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []

const auditApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    return apiClient.get(`/audit?${query.toString()}`)
  },
}

export default function AuditPage() {
  const { can } = useAuthorization()
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const query = useQuery({
    queryKey: ['cadenza', 'audit', action, entityType],
    queryFn: () => auditApi.list({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc', ...(action ? { action } : {}), ...(entityType ? { entityType } : {}) }),
    enabled: can('audit_logs:read'),
  })

  if (!can('audit_logs:read')) return <Alert><AlertDescription>You do not have permission to view audit logs.</AlertDescription></Alert>
  if (query.isLoading) return <LoadingState label="Loading audit activity…" rows={6} />
  if (query.error) return <Alert variant="destructive"><AlertDescription>{query.error.message}</AlertDescription></Alert>

  return <div className="grid gap-6">
    <PageHeader title="Audit Activity" description="Review lesson, payment, enrollment, and operational changes." />
    <Card><CardContent className="pt-6"><div className="mb-4 flex gap-3"><Input className="max-w-xs" placeholder="Filter action…" value={action} onChange={(e) => setAction(e.currentTarget.value)} /><Input className="max-w-xs" placeholder="Filter entity type…" value={entityType} onChange={(e) => setEntityType(e.currentTarget.value)} /><Button variant="outline" onClick={() => { setAction(''); setEntityType('') }}>Clear</Button></div>
      <DataTable columns={[
        { key: 'createdAt', header: 'Time', value: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—' },
        { key: 'action', header: 'Action', render: (row) => <Badge variant="secondary">{row.action ?? '—'}</Badge> },
        { key: 'entityType', header: 'Entity', value: (row) => row.entityType ?? '—' },
        { key: 'entityId', header: 'Entity ID', value: (row) => row.entityId ?? '—' },
        { key: 'actorId', header: 'Actor', value: (row) => row.actorId ?? 'System' },
      ]} rows={unwrap(query.data)} searchPlaceholder="Search audit activity…" />
    </CardContent></Card>
  </div>
}
