import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import LoadingState from '../../../components/loading-state'
import PageHeader from '../../../components/page-header'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import SelectField from '../../../components/select-field'
import { schedulingApi } from '../../scheduling/api/scheduling.api'

const unwrap = (value) => value?.data ?? value ?? []

const formatDate = (value, options = {}) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        ...options,
      }).format(new Date(value))
    : '—'

const getStudentName = (row) =>
  row.enrollment?.customer?.person?.fullName ??
  ([row.enrollment?.customer?.person?.firstName, row.enrollment?.customer?.person?.lastName]
    .filter(Boolean)
    .join(' ') || 'Student')

const getLessonName = (row) => row.enrollment?.lessonPackage?.name ?? 'Lesson'

const isUpcoming = (row, now) => new Date(row.scheduledStart).getTime() >= now.getTime()

const needsAttendance = (row, now) =>
  row.status === 'SCHEDULED' &&
  !row.attendance &&
  new Date(row.scheduledEnd).getTime() < now.getTime()

export default function InstructorTeachingPage() {
  const client = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [attendance, setAttendance] = useState('PRESENT')
  const [notes, setNotes] = useState('')
  const [showAll, setShowAll] = useState(false)

  const sessions = useQuery({
    queryKey: ['cadenza', 'instructor', 'sessions'],
    queryFn: schedulingApi.listSessions,
  })

  const markAttendance = useMutation({
    mutationFn: ({ id, status, note }) =>
      schedulingApi.markAttendance(id, { status, notes: note || undefined }),
    onSuccess: () => {
      setSelected(null)
      setAttendance('PRESENT')
      setNotes('')
      client.invalidateQueries({ queryKey: ['cadenza', 'instructor', 'sessions'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'lessons', 'sessions'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'dashboard'] })
    },
  })

  const rows = unwrap(sessions.data)

  const view = useMemo(() => {
    const now = new Date()
    const todayKey = now.toDateString()
    const today = rows
      .filter((row) => new Date(row.scheduledStart).toDateString() === todayKey)
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
    const pending = rows
      .filter((row) => needsAttendance(row, now))
      .sort((a, b) => new Date(a.scheduledEnd) - new Date(b.scheduledEnd))
    const upcoming = rows
      .filter((row) => isUpcoming(row, now))
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
    const students = new Set(rows.map(getStudentName))

    return {
      today,
      pending,
      upcoming,
      studentCount: students.size,
      next: upcoming[0] ?? null,
    }
  }, [rows])

  if (sessions.isLoading) return <LoadingState label="Loading your teaching schedule…" rows={5} />
  if (sessions.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load teaching schedule</AlertTitle>
        <AlertDescription>{sessions.error.message}</AlertDescription>
      </Alert>
    )
  }

  const openAttendance = (row) => {
    setSelected(row)
    setAttendance(row.attendance?.status ?? 'PRESENT')
    setNotes(row.attendance?.notes ?? '')
  }

  const columns = [
    { key: 'time', header: 'Schedule', value: (row) => formatDate(row.scheduledStart) },
    { key: 'student', header: 'Student', value: getStudentName },
    { key: 'package', header: 'Lesson', value: getLessonName },
    {
      key: 'room',
      header: 'Room',
      value: (row) => row.room?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.attendance?.status ?? row.status}</Badge>,
    },
    {
      key: 'action',
      header: 'Action',
      searchable: false,
      render: (row) =>
        row.status === 'SCHEDULED' ? (
          <Button size="sm" variant={row.attendance ? 'outline' : 'default'} onClick={() => openAttendance(row)}>
            {row.attendance ? 'Update' : 'Attendance'}
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Teaching"
        description="Your teaching day, assigned students, and attendance in one focused workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Today" value={view.today.length} detail="assigned sessions" />
        <SummaryCard label="Attendance due" value={view.pending.length} detail="past sessions without a result" />
        <SummaryCard label="Upcoming" value={view.upcoming.length} detail="future assigned sessions" />
        <SummaryCard label="Students" value={view.studentCount} detail="students in your schedule" />
      </div>

      {view.pending.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Attendance due</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Finish attendance for sessions that have already ended.</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {view.pending.slice(0, 5).map((row) => (
              <SessionRow key={row.id} row={row} actionLabel="Record attendance" onAction={() => openAttendance(row)} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {view.today.length === 0 ? (
              <EmptyState text="No sessions are scheduled for today." />
            ) : (
              view.today.map((row) => (
                <SessionRow
                  key={row.id}
                  row={row}
                  actionLabel={row.attendance ? 'View attendance' : 'Attendance'}
                  onAction={() => openAttendance(row)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next session</CardTitle>
          </CardHeader>
          <CardContent>
            {view.next ? (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{getLessonName(view.next)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{getStudentName(view.next)}</p>
                </div>
                <div className="rounded-lg border p-4 text-sm">
                  <p>{formatDate(view.next.scheduledStart)}</p>
                  <p className="mt-1 text-muted-foreground">{view.next.room?.name ?? 'Room not assigned'}</p>
                </div>
                <Button className="w-full" variant="outline" onClick={() => openAttendance(view.next)}>
                  View session
                </Button>
              </div>
            ) : (
              <EmptyState text="No upcoming sessions." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Teaching schedule</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Search your complete assigned session history.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Show recent' : 'View all'}
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={showAll ? rows : rows.slice().sort((a, b) => new Date(b.scheduledStart) - new Date(a.scheduledStart)).slice(0, 10)}
            searchPlaceholder="Search students, lessons, or rooms…"
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.attendance ? 'Update attendance' : 'Record attendance'}</DialogTitle>
            <DialogDescription>Record the outcome for this assigned teaching session.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="grid gap-4">
              <div className="rounded-lg border p-4 text-sm">
                <p className="font-medium">{getStudentName(selected)}</p>
                <p className="text-muted-foreground">{getLessonName(selected)}</p>
                <div className="mt-3 grid gap-1 sm:grid-cols-2">
                  <span>{formatDate(selected.scheduledStart)}</span>
                  <span>{selected.room?.name ?? 'Room not assigned'}</span>
                </div>
              </div>

              <SelectField
                label="Attendance"
                options={[
                  { value: 'PRESENT', label: 'Present' },
                  { value: 'LATE', label: 'Late' },
                  { value: 'EXCUSED', label: 'Excused' },
                  { value: 'ABSENT', label: 'Absent' },
                ]}
                value={attendance}
                onChange={(value) => setAttendance(value || 'PRESENT')}
              />

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Optional attendance or lesson note"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              disabled={markAttendance.isPending}
              onClick={() => selected && markAttendance.mutate({ id: selected.id, status: attendance, note: notes })}
            >
              {markAttendance.isPending ? 'Saving…' : 'Save attendance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({ label, value, detail }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function SessionRow({ row, actionLabel, onAction }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{getLessonName(row)}</p>
          <Badge variant="secondary">{row.attendance?.status ?? row.status}</Badge>
        </div>
        <p className="mt-1 text-sm">{getStudentName(row)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDate(row.scheduledStart)} · {row.room?.name ?? 'Room not assigned'}
        </p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>
}
