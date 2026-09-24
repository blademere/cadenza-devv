import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Card, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { resourcesApi } from '../api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

export default function ResourceAuditPage() {
  const { can } = useAuthorization()
  const query = useQuery({ queryKey: ['cadenza', 'resource-audit'], queryFn: resourcesApi.getAudit, enabled: can('audit_logs:read') })
  if (!can('audit_logs:read')) return <Alert><AlertDescription>You do not have permission to view resource audit logs.</AlertDescription></Alert>
  if (query.isLoading) return <LoadingState label="Loading resource audit trail…" rows={6} />
  if (query.error) return <Alert variant="destructive"><AlertDescription>{query.error.message}</AlertDescription></Alert>
  const result = query.data?.data ?? query.data ?? []
  const rows = Array.isArray(result) ? result : result.data ?? []
  return <div className="grid gap-6"><PageHeader title="Resource Audit Trail" description="Track resource creation and changes without mixing them into rental operations." /><Card><CardContent className="pt-6"><DataTable columns={[
    { key: 'createdAt', header: 'Time', value: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—' },
    { key: 'action', header: 'Action', render: (row) => <Badge variant="secondary">{row.action}</Badge> },
    { key: 'entityId', header: 'Resource', value: (row) => row.entityId ?? '—' },
    { key: 'actor', header: 'Actor', value: (row) => row.actor?.email ?? row.actorId ?? 'System' },
  ]} rows={rows} searchPlaceholder="Search resource audit…" /></CardContent></Card></div>
}