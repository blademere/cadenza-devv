import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import DataTable from '../../components/data-table'
import LoadingState from '../../components/loading-state'
import PageHeader from '../../components/page-header'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import SelectField from '../../components/select-field'
import { schedulingApi } from '../scheduling/api/scheduling.api'

const unwrap = (value) => value?.data ?? value ?? []
const formatDate = (value) =>
  value ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '—'

export default function InstructorPage() {
  const client = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [attendance, setAttendance] = useState('PRESENT')
  const [notes, setNotes] = useState('')

  const sessions = useQuery({ queryKey: ['cadenza', 'instructor', 'sessions'], queryFn: schedulingApi.listSessions })
  const markAttendance = useMutation({
    mutationFn: ({ id, status, note }) => schedulingApi.markAttendance(id, { status, notes: note || undefined }),
    onSuccess: () => {
      setSelected(null); setAttendance('PRESENT'); setNotes('')
      client.invalidateQueries({ queryKey: ['cadenza', 'instructor', 'sessions'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'lessons', 'sessions'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'dashboard'] })
    },
  })

  if (sessions.isLoading) return <LoadingState label="Loading your teaching schedule…" rows={5} />
  if (sessions.error) return <Alert variant="destructive"><AlertTitle>Unable to load teaching schedule</AlertTitle><AlertDescription>{sessions.error.message}</AlertDescription></Alert>

  const rows = unwrap(sessions.data)
  const todayKey = new Date().toDateString()
  const today = rows.filter((row) => new Date(row.scheduledStart).toDateString() === todayKey)
  const pendingAttendance = rows.filter((row) => row.status === 'SCHEDULED' && !row.attendance)

  const columns = [
    { key: 'time', header: 'Schedule', value: (row) => formatDate(row.scheduledStart) },
    { key: 'student', header: 'Student', value: (row) => row.enrollment?.customer?.person?.fullName ?? ([row.enrollment?.customer?.person?.firstName, row.enrollment?.customer?.person?.lastName].filter(Boolean).join(' ') || 'Student') },
    { key: 'package', header: 'Lesson', value: (row) => row.enrollment?.lessonPackage?.name ?? 'Lesson' },
    { key: 'status', header: 'Status', render: (row) => <Badge variant="secondary">{row.attendance?.status ?? row.status}</Badge> },
    { key: 'action', header: 'Action', searchable: false, render: (row) => row.status === 'SCHEDULED' ? <Button size="sm" onClick={() => setSelected(row)}>{row.attendance ? 'Update attendance' : 'Mark attendance'}</Button> : null },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="My Teaching" description="Your assigned lessons, students, and attendance in one focused workspace." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Today</p><p className="mt-2 text-2xl font-semibold">{today.length}</p><p className="mt-1 text-xs text-muted-foreground">scheduled sessions</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Attendance pending</p><p className="mt-2 text-2xl font-semibold">{pendingAttendance.length}</p><p className="mt-1 text-xs text-muted-foreground">sessions need a result</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Upcoming</p><p className="mt-2 text-2xl font-semibold">{rows.filter((row) => new Date(row.scheduledStart) >= new Date()).length}</p><p className="mt-1 text-xs text-muted-foreground">assigned sessions</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Teaching schedule</CardTitle></CardHeader><CardContent><DataTable columns={columns} rows={rows} searchPlaceholder="Search students or lessons…" /></CardContent></Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Record attendance</DialogTitle></DialogHeader>
          {selected && <div className="grid gap-4">
            <div className="rounded-lg border p-4 text-sm"><p className="font-medium">{selected.enrollment?.customer?.person?.fullName ?? 'Student'}</p><p className="text-muted-foreground">{selected.enrollment?.lessonPackage?.name ?? 'Lesson'} · {formatDate(selected.scheduledStart)}</p></div>
            <SelectField label="Attendance" options={[{ value: 'PRESENT', label: 'Present' }, { value: 'LATE', label: 'Late' }, { value: 'EXCUSED', label: 'Excused' }, { value: 'ABSENT', label: 'Absent' }]} value={attendance} onChange={(value) => setAttendance(value || 'PRESENT')} />
            <div className="grid gap-2"><Label>Notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} placeholder="Optional lesson or attendance note" /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button disabled={markAttendance.isPending} onClick={() => selected && markAttendance.mutate({ id: selected.id, status: attendance, note: notes })}>{markAttendance.isPending ? 'Saving…' : 'Save attendance'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
