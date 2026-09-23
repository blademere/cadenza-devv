import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import DataTable from '../components/data-table'
import PageHeader from '../components/page-header'
import LoadingState from '../components/loading-state'
import { apiClient } from '../services/api/client'

const dashboardApi = { get: () => apiClient.get('/cadenza/dashboard') }
const unwrap = (response) => response?.data ?? response ?? {}

export default function DashboardPage() {
  const query = useQuery({ queryKey: ['cadenza', 'dashboard'], queryFn: dashboardApi.get })
  if (query.isLoading) return <LoadingState label="Loading Cadenza dashboard…" rows={4} />
  if (query.error) return <Alert variant="destructive"><AlertTitle>Unable to load dashboard</AlertTitle><AlertDescription>{query.error.message}</AlertDescription></Alert>
  const data = unwrap(query.data)
  const cards = [['Today’s sessions', data.today?.sessions ?? 0], ['Outstanding payments', data.outstandingPayments ?? 0], ['Open rentals', data.openRentals ?? 0], ['Pending enrollments', data.pendingEnrollments ?? data.attendancePending ?? 0]]
  const workload = data.assignedSessions ?? data.todaysSessions ?? data.enrollments ?? []
  const columns = [
    { key: 'name', header: 'Item', value: (row) => row.name ?? row.lessonPackage?.name ?? row.id },
    { key: 'status', header: 'Status', render: (row) => <Badge variant="secondary">{row.status ?? '—'}</Badge> },
  ]
  return <div className="space-y-6">
    <PageHeader title="Dashboard" description="Role-aware Cadenza operations at a glance." />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Current workload</CardTitle><Badge variant="outline">{workload.length}</Badge></CardHeader><CardContent><DataTable columns={columns} rows={workload} searchPlaceholder="Search workload…" /></CardContent></Card>
  </div>
}
