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

function WorkloadCard({ title, rows, empty = 'Nothing to show.' }) {
  const columns = [
    { key: 'name', header: 'Item', value: (row) => row.name ?? row.lessonPackage?.name ?? row.id },
    { key: 'status', header: 'Status', render: (row) => <Badge variant="secondary">{row.status ?? '—'}</Badge> },
  ]
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="outline">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length ? <DataTable columns={columns} rows={rows} searchPlaceholder="Search…" /> : <p className="py-6 text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const query = useQuery({ queryKey: ['cadenza', 'dashboard'], queryFn: dashboardApi.get })
  if (query.isLoading) return <LoadingState label="Loading Cadenza dashboard…" rows={4} />
  if (query.error) return <Alert variant="destructive"><AlertTitle>Unable to load dashboard</AlertTitle><AlertDescription>{query.error.message}</AlertDescription></Alert>

  const data = unwrap(query.data)
  const instructor = data.instructor
  const customer = data.customer
  const operations = data.mode === 'operations'
  const cards = operations
    ? [
        ['Today’s sessions', data.today?.sessions ?? 0],
        ['Pending enrollments', data.pendingEnrollments ?? 0],
        ['Open rentals', data.openRentals ?? 0],
        ['Outstanding payments', data.outstandingPayments ?? 0],
      ]
    : [
        ['My sessions', instructor?.assignedSessions?.length ?? 0],
        ['Attendance pending', instructor?.attendancePending ?? 0],
        ['My enrollments', customer?.enrollments?.length ?? 0],
        ['My rentals', customer?.rentals?.length ?? 0],
      ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={operations ? 'Cadenza Operations' : 'My Cadenza'}
        description={operations ? 'A concise view of the school workload and today’s activity.' : 'Your lessons, teaching schedule, rentals, and payments in one place.'}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></CardContent></Card>
        ))}
      </div>
      {instructor && <WorkloadCard title="My teaching schedule" rows={instructor.assignedSessions ?? []} empty="No assigned lessons yet." />}
      {customer && <div className="grid gap-6 xl:grid-cols-2"><WorkloadCard title="My lesson enrollments" rows={customer.enrollments ?? []} empty="No lesson enrollments yet." /><WorkloadCard title="My rentals" rows={customer.rentals ?? []} empty="No rentals yet." /></div>}
      {operations && <WorkloadCard title="Today’s workload" rows={data.todaysSessions ?? []} empty="No sessions scheduled today." />}
    </div>
  )
}