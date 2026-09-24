import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { schedulingApi } from '../../scheduling/api/scheduling.api'

const unwrap = (value) => value?.data ?? value ?? []
const HISTORY_STATUSES = ['COMPLETED', 'MISSED', 'CANCELLED']

export default function LessonHistoryPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const sessions = useQuery({ queryKey: ['cadenza', 'customer', 'sessions'], queryFn: schedulingApi.listSessions })

  const allRows = useMemo(() => unwrap(sessions.data)
    .filter((item) => HISTORY_STATUSES.includes(item.status))
    .sort((a, b) => new Date(b.scheduledStart ?? 0).getTime() - new Date(a.scheduledStart ?? 0).getTime()), [sessions.data])

  const rows = useMemo(() => allRows.filter((item) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || [
      item.enrollment?.lessonPackage?.name,
      item.instructor?.person?.fullName,
      item.room?.name,
      item.room?.resource?.name,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(term))

    return matchesSearch && (status === 'ALL' || item.status === status)
  }), [allRows, search, status])

  if (sessions.isLoading) return <LoadingState label="Loading lesson history…" rows={6} />
  if (sessions.error) return <Alert variant="destructive"><AlertDescription>{sessions.error.message}</AlertDescription></Alert>

  return (
    <div className="space-y-6">
      <PageHeader title="Lesson History" description="Review lessons you have completed, missed, or cancelled." />
      <Card><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div><p className="font-semibold">Your lesson history</p><p className="text-sm text-muted-foreground">{rows.length} of {allRows.length} sessions</p></div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row"><Input className="md:w-64" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search lessons…" aria-label="Search lesson history" /><div className="flex gap-2">{['ALL', ...HISTORY_STATUSES].map((value) => <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} onClick={() => setStatus(value)}>{value === 'ALL' ? 'All' : value}</Button>)}</div></div>
      </CardContent></Card>
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center"><p className="font-medium">{allRows.length ? 'No matching lessons' : 'No lesson history yet'}</p><p className="mt-1 text-sm text-muted-foreground">{allRows.length ? 'Try a different search or status.' : 'Completed and past lesson sessions will appear here.'}</p></CardContent></Card> :
        <div className="overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_120px] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid"><span>Lesson</span><span>Date & time</span><span>Instructor / room</span><span>Status</span></div>
          <div className="divide-y">{rows.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_120px] md:items-center md:gap-4"><div><p className="font-medium">{item.enrollment?.lessonPackage?.name ?? 'Music lesson'}</p><p className="text-xs text-muted-foreground">{item.attendance?.status ? ('Attendance: ' + item.attendance.status) : 'Session record'}</p></div><div className="text-sm">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : '—'}</div><div className="text-sm text-muted-foreground">{item.instructor?.person?.fullName ?? item.instructor?.person?.firstName ?? '—'}{item.room?.name || item.room?.resource?.name ? ' · ' + (item.room?.name ?? item.room?.resource?.name) : ''}</div><div><Badge variant={item.status === 'COMPLETED' ? 'secondary' : 'outline'}>{item.status}</Badge></div></div>)}</div>
        </div>}
    </div>
  )
}
