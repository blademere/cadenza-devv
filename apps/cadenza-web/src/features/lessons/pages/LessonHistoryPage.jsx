import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { schedulingApi } from '../../scheduling/api/scheduling.api'

const unwrap = (value) => value?.data ?? value ?? []
const HISTORY_STATUSES = ['COMPLETED', 'MISSED', 'CANCELLED']

export default function LessonHistoryPage() {
  const sessions = useQuery({ queryKey: ['cadenza', 'customer', 'sessions'], queryFn: schedulingApi.listSessions })
  if (sessions.isLoading) return <LoadingState label="Loading lesson history…" rows={6} />
  if (sessions.error) return <Alert variant="destructive"><AlertDescription>{sessions.error.message}</AlertDescription></Alert>
  const rows = unwrap(sessions.data).filter((item) => HISTORY_STATUSES.includes(item.status)).sort((a, b) => new Date(b.scheduledStart ?? 0).getTime() - new Date(a.scheduledStart ?? 0).getTime())

  return (
    <div className="space-y-6">
      <PageHeader title="Lesson History" description="Review lessons you have completed, missed, or cancelled." />
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No lesson history yet.</CardContent></Card> :
        <div className="overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_120px] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid"><span>Lesson</span><span>Date & time</span><span>Instructor / room</span><span>Status</span></div>
          <div className="divide-y">{rows.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_120px] md:items-center md:gap-4"><div><p className="font-medium">{item.enrollment?.lessonPackage?.name ?? 'Music lesson'}</p><p className="text-xs text-muted-foreground">{item.attendance?.status ? ('Attendance: ' + item.attendance.status) : 'Session record'}</p></div><div className="text-sm">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : '—'}</div><div className="text-sm text-muted-foreground">{item.instructor?.person?.fullName ?? item.instructor?.person?.firstName ?? '—'}{item.room?.name || item.room?.resource?.name ? ' · ' + (item.room?.name ?? item.room?.resource?.name) : ''}</div><div><Badge variant={item.status === 'COMPLETED' ? 'secondary' : 'outline'}>{item.status}</Badge></div></div>)}</div>
        </div>}
    </div>
  )
}
