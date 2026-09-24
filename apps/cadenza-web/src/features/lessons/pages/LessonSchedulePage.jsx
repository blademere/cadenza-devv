import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import DataTable from '../../../components/data-table'
import LoadingState from '../../../components/loading-state'
import PageHeader from '../../../components/page-header'
import SelectField from '../../../components/select-field'
import { lessonsApi } from '../api/lessons.api'
import { schedulingApi } from '../../scheduling/api/scheduling.api'
import { instructorsApi } from '../../instructors/api/instructors.api'
import { resourcesApi } from '../../resources/api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const personName = (person, fallback = 'Unknown person') => [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || person?.email || fallback

export default function LessonSchedulePage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canManage = can('cadenza_lessons:manage')
  const canSchedule = can('cadenza_lessons:schedule')
  const canAttendance = can('cadenza_lessons:attendance')
  const canRequest = can('cadenza_lessons:request_reschedule')
  const canReview = can('cadenza_lessons:review_reschedule')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [attendance, setAttendance] = useState('PRESENT')
  const [notes, setNotes] = useState('')
  const [request, setRequest] = useState(null)
  const [schedule, setSchedule] = useState({ enrollmentId: '', instructorId: '', roomId: '', startAt: '' })

  const enrollmentsQuery = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments })
  const sessionsQuery = useQuery({ queryKey: ['cadenza', 'sessions'], queryFn: schedulingApi.listSessions })
  const instructorsQuery = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list })
  const roomsQuery = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms })
  const reschedulesQuery = useQuery({ queryKey: ['cadenza', 'reschedules'], queryFn: schedulingApi.listReschedules, enabled: canReview || canManage })

  const generateSchedule = useMutation({ mutationFn: schedulingApi.generateSchedule, onSuccess: () => { setScheduleOpen(false); setSchedule({ enrollmentId: '', instructorId: '', roomId: '', startAt: '' }); client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] }); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }) } })
  const markAttendance = useMutation({ mutationFn: ({ id, payload }) => schedulingApi.markAttendance(id, payload), onSuccess: () => { setSelected(null); client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] }); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }) } })
  const transition = useMutation({ mutationFn: ({ type, id }) => schedulingApi[type](id), onSuccess: () => { client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] }); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }) } })
  const requestReschedule = useMutation({ mutationFn: schedulingApi.requestReschedule, onSuccess: () => { setRequest(null); client.invalidateQueries({ queryKey: ['cadenza', 'reschedules'] }) } })
  const review = useMutation({ mutationFn: ({ id, approve }) => schedulingApi.reviewReschedule(id, approve), onSuccess: () => { client.invalidateQueries({ queryKey: ['cadenza', 'reschedules'] }); client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] }) } })

  if (enrollmentsQuery.isLoading || sessionsQuery.isLoading || instructorsQuery.isLoading || roomsQuery.isLoading || reschedulesQuery.isLoading) return <LoadingState label="Loading lesson schedule…" rows={6} />
  const error = enrollmentsQuery.error || sessionsQuery.error || instructorsQuery.error || roomsQuery.error || reschedulesQuery.error || generateSchedule.error || markAttendance.error || transition.error || requestReschedule.error || review.error
  if (error) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
  const enrollments = unwrap(enrollmentsQuery.data)
  const sessions = unwrap(sessionsQuery.data)
  const instructors = unwrap(instructorsQuery.data)
  const rooms = unwrap(roomsQuery.data)
  const pending = unwrap(reschedulesQuery.data).filter((item) => item.status === 'PENDING')
  const confirmed = enrollments.filter((item) => item.status === 'CONFIRMED')
  const selectedEnrollment = confirmed.find((item) => item.id === schedule.enrollmentId)
  const selectedPackage = selectedEnrollment?.lessonPackage

  const openAttendance = (item) => { setSelected(item); setAttendance(item.attendance?.status ?? 'PRESENT'); setNotes(item.attendance?.notes ?? '') }

  return <div className="space-y-6">
    <PageHeader title="Lesson Schedule" description="Schedule paid enrollments, manage sessions, record attendance, and process reschedule requests." actions={canSchedule ? <Button onClick={() => setScheduleOpen(true)}>Generate schedule</Button> : null} />
    <div className="grid gap-4 sm:grid-cols-4"><Summary label="Sessions" value={sessions.length} /><Summary label="Scheduled" value={sessions.filter((item) => item.status === 'SCHEDULED').length} /><Summary label="Completed" value={sessions.filter((item) => item.status === 'COMPLETED').length} /><Summary label="Pending reschedules" value={pending.length} /></div>
    <Card><CardContent className="pt-6"><DataTable columns={[
      { key: 'time', header: 'Schedule', value: (item) => item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : '—' },
      { key: 'student', header: 'Customer', value: (item) => item.enrollment?.customer?.person?.name ?? item.enrollment?.customer?.person?.fullName ?? item.enrollment?.customerId ?? '—' },
      { key: 'lesson', header: 'Lesson', value: (item) => item.enrollment?.lessonPackage?.name ?? item.enrollmentId ?? '—' },
      { key: 'instructor', header: 'Instructor', value: (item) => item.instructor?.person?.name ?? item.instructorId ?? 'Unassigned' },
      { key: 'room', header: 'Room', value: (item) => item.room?.name ?? item.roomId ?? 'Unassigned' },
      { key: 'status', header: 'Status', render: (item) => <Badge variant="secondary">{item.attendance?.status ?? item.status}</Badge> },
      { key: 'actions', header: 'Actions', searchable: false, render: (item) => <div className="flex flex-wrap gap-2">{canAttendance && item.status === 'SCHEDULED' && <Button size="sm" onClick={() => openAttendance(item)}>{item.attendance ? 'Update attendance' : 'Attendance'}</Button>}{canRequest && item.status === 'SCHEDULED' && <Button size="sm" variant="outline" onClick={() => setRequest({ id: item.id, requestedStart: '', requestedEnd: '', reason: '' })}>Reschedule</Button>}{canManage && item.status === 'SCHEDULED' && <><Button size="sm" variant="outline" onClick={() => transition.mutate({ type: 'completeSession', id: item.id })}>Complete</Button><Button size="sm" variant="outline" onClick={() => generateSchedule.mutate({ enrollmentId: item.enrollmentId, instructorId: item.instructorId, roomId: item.roomId || undefined, regenerate: true, anchorSessionId: item.id })}>Regenerate remaining</Button><Button size="sm" variant="destructive" onClick={() => transition.mutate({ type: 'cancelSession', id: item.id })}>Cancel</Button></>}</div> },
    ]} rows={sessions} searchPlaceholder="Search customers, lessons, instructors, or rooms…" /></CardContent></Card>

    {(canReview || canManage) && <Card><CardContent className="pt-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Reschedule requests</h2><p className="text-sm text-muted-foreground">Review customer requests before changing a session.</p></div><Badge variant="outline">{pending.length}</Badge></div>{pending.length ? <div className="grid gap-2">{pending.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{new Date(item.requestedStart).toLocaleString()} – {new Date(item.requestedEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p><p className="text-xs text-muted-foreground">Current session: {item.session?.scheduledStart ? new Date(item.session.scheduledStart).toLocaleString() : '—'} · {item.reason || 'No reason provided'}</p></div><div className="flex gap-2"><Button size="sm" disabled={!canReview && !canManage} onClick={() => review.mutate({ id: item.id, approve: true })}>Approve</Button><Button size="sm" variant="destructive" disabled={!canReview && !canManage} onClick={() => review.mutate({ id: item.id, approve: false })}>Reject</Button></div></div>)}</div> : <p className="text-sm text-muted-foreground">No pending reschedule requests.</p>}</CardContent></Card>}

    <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Generate lesson schedule</DialogTitle><DialogDescription>The system creates the remaining sessions from the package count, session duration, weekly cadence, instructor availability, room availability, and existing bookings.</DialogDescription></DialogHeader><div className="grid gap-4"><SelectField label="Enrollment" options={confirmed.map((item) => ({ value: item.id, label: `${item.lessonPackage?.name ?? item.id} · ${item.customer?.person?.name ?? item.customer?.person?.fullName ?? item.customerId ?? 'Customer'} · ${item.lessonPackage?.numberOfSessions ?? 0} sessions` }))} value={schedule.enrollmentId} onChange={(value) => setSchedule({ ...schedule, enrollmentId: value || '' })} placeholder="Select confirmed enrollment" />{selectedPackage && <div className="rounded-lg border bg-muted/30 p-4"><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Sessions</p><p className="font-medium">{selectedPackage.numberOfSessions ?? 0}</p></div><div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{selectedPackage.sessionDurationMinutes ?? 60} min</p></div><div><p className="text-xs text-muted-foreground">Cadence</p><p className="font-medium">{selectedPackage.sessionsPerWeek ?? 1} / week</p></div></div><p className="mt-3 text-xs text-muted-foreground">The generator fills the earliest conflict-free slots that fit this cadence. You do not need to create each session manually.</p></div>}<div className="grid gap-4 sm:grid-cols-2"><SelectField label="Instructor" options={instructors.map((item) => ({ value: item.id, label: personName(item.person, 'Instructor') }))} value={schedule.instructorId} onChange={(value) => setSchedule({ ...schedule, instructorId: value || '' })} placeholder="Select instructor" /><SelectField label="Room (optional)" options={[{ value: '', label: 'Auto-assign available room' }, ...rooms.map((item) => ({ value: item.id, label: item.resource?.name ?? item.name ?? item.roomType ?? 'Band room' }))]} value={schedule.roomId} onChange={(value) => setSchedule({ ...schedule, roomId: value || '' })} placeholder="Auto-assign available room" /></div><Field label="Start searching from (optional)"><Input type="datetime-local" value={schedule.startAt} onChange={(e) => setSchedule({ ...schedule, startAt: e.currentTarget.value })} /></Field><p className="text-xs text-muted-foreground">Start time is a lower boundary, not an exact appointment. The scheduler may choose a later available slot when needed.</p></div><DialogFooter><Button disabled={!schedule.enrollmentId || !schedule.instructorId || generateSchedule.isPending} onClick={() => generateSchedule.mutate({ enrollmentId: schedule.enrollmentId, instructorId: schedule.instructorId, roomId: schedule.roomId || undefined, startAt: schedule.startAt ? new Date(schedule.startAt).toISOString() : undefined })}>{generateSchedule.isPending ? 'Generating…' : 'Generate schedule'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>Record attendance</DialogTitle><DialogDescription>Save attendance for this lesson session.</DialogDescription></DialogHeader><div className="grid gap-4"><SelectField label="Attendance" options={['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((value) => ({ value, label: value }))} value={attendance} onChange={(value) => setAttendance(value || 'PRESENT')} /><Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} placeholder="Optional attendance or lesson note" /></Field></div><DialogFooter><Button disabled={markAttendance.isPending} onClick={() => markAttendance.mutate({ id: selected.id, payload: { status: attendance, notes: notes || undefined } })}>{markAttendance.isPending ? 'Saving…' : 'Save attendance'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && setRequest(null)}><DialogContent><DialogHeader><DialogTitle>Request reschedule</DialogTitle><DialogDescription>Choose a replacement time for this lesson session.</DialogDescription></DialogHeader><div className="grid gap-4"><Field label="Requested start"><Input type="datetime-local" value={request?.requestedStart ?? ''} onChange={(e) => setRequest({ ...request, requestedStart: e.currentTarget.value })} /></Field><Field label="Requested end"><Input type="datetime-local" value={request?.requestedEnd ?? ''} onChange={(e) => setRequest({ ...request, requestedEnd: e.currentTarget.value })} /></Field><Field label="Reason"><Textarea value={request?.reason ?? ''} onChange={(e) => setRequest({ ...request, reason: e.currentTarget.value })} /></Field></div><DialogFooter><Button disabled={!request?.requestedStart || !request?.requestedEnd || requestReschedule.isPending} onClick={() => requestReschedule.mutate({ sessionId: request.id, requestedStart: new Date(request.requestedStart).toISOString(), requestedEnd: new Date(request.requestedEnd).toISOString(), reason: request.reason || undefined })}>{requestReschedule.isPending ? 'Submitting…' : 'Submit request'}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
function Summary({ label, value }) { return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card> }
function Field({ label, children }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div> }
