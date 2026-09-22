import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
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
  return <div className="grid gap-6"><div><p className="cadenza-eyebrow">Workspace</p><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1><p className="text-sm text-muted-foreground">Role-aware Cadenza operations at a glance.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</div><Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Current workload</CardTitle><p className="text-sm text-muted-foreground">The dashboard is filtered by the authenticated Cadenza role.</p></div><Badge>{(data.assignedSessions ?? data.todaysSessions ?? data.enrollments ?? []).length}</Badge></CardHeader></Card></div>
}
