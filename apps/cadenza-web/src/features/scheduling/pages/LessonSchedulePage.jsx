import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, Select, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { schedulingApi } from '../api/scheduling.api'
import { lessonsApi } from '../../lessons/api/lessons.api'
import { instructorsApi } from '../../instructors/api/instructors.api'
import { resourcesApi } from '../../resources/api/resources.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function LessonSchedulePage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['cadenza', 'lesson-sessions'], queryFn: schedulingApi.listSessions })
  const enrollments = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments })
  const reschedules = useQuery({ queryKey: ['cadenza', 'reschedules'], queryFn: schedulingApi.listReschedules })
  const instructors = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list })
  const rooms = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms })
  const [selected, setSelected] = useState(null)
  const [createOpened, setCreateOpened] = useState(false)
  const [rescheduleOpened, setRescheduleOpened] = useState(null)
  const [status, setStatus] = useState('PRESENT')
  const [notes, setNotes] = useState('')
  const [form, setForm] = useState({ enrollmentId: null, instructorId: null, roomId: null, scheduledStart: '', scheduledEnd: '' })
  const [reschedule, setReschedule] = useState({ requestedStart: '', requestedEnd: '', reason: '' })
  const attendance = useMutation({ mutationFn: ({ id, value }) => schedulingApi.markAttendance(id, value), onSuccess: () => { setSelected(null); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-sessions'] }) } })
  const transition = useMutation({ mutationFn: ({ id, type }) => schedulingApi[type](id), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'lesson-sessions'] }) })
  const create = useMutation({ mutationFn: schedulingApi.createSession, onSuccess: () => { setCreateOpened(false); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-sessions'] }) } })
  const review = useMutation({ mutationFn: ({ id, approve }) => schedulingApi.reviewReschedule(id, approve), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'reschedules'] }) })
  const request = useMutation({ mutationFn: schedulingApi.requestReschedule, onSuccess: () => setRescheduleOpened(null) })
  if (query.isLoading) return <LoadingState label="Loading lesson schedule…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load lesson schedule">{query.error.message}</Alert>
  const sessions = unwrap(query.data)
  const enrollmentData = unwrap(enrollments.data)
  const instructorData = unwrap(instructors.data)
  const roomData = unwrap(rooms.data)
  const rescheduleData = unwrap(reschedules.data)
  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Lesson Schedule</Title><Text c="dimmed">Schedule sessions, assign instructors and rooms, attendance, and reschedules.</Text></div><Button onClick={() => setCreateOpened(true)}>Schedule session</Button></Group>
    {(attendance.error || transition.error || create.error || request.error || review.error) && <Alert color="red" title="Schedule operation failed">{(attendance.error || transition.error || create.error || request.error).message}</Alert>}
    <Card withBorder><Stack><Group justify="space-between"><Title order={4}>Pending reschedule requests</Title><Badge>{rescheduleData.filter((r) => r.status === 'PENDING').length}</Badge></Group>{!rescheduleData.filter((r) => r.status === 'PENDING').length ? <Text c="dimmed">No pending requests.</Text> : rescheduleData.filter((r) => r.status === 'PENDING').map((r) => <Card key={r.id} withBorder><Group justify="space-between"><Text size="sm">{new Date(r.requestedStart).toLocaleString()} – {new Date(r.requestedEnd).toLocaleString()}</Text><Group><Button size="xs" loading={review.isPending} onClick={() => review.mutate({ id: r.id, approve: true })}>Approve</Button><Button size="xs" color="red" variant="subtle" loading={review.isPending} onClick={() => review.mutate({ id: r.id, approve: false })}>Reject</Button></Group></Group><Text size="xs" c="dimmed">{r.reason || 'No reason provided'}</Text></Card>)}</Stack></Card>
    {!sessions.length ? <Alert color="gray" title="No scheduled sessions">Confirmed lesson enrollments can be scheduled here.</Alert> :
      <SimpleGrid cols={{ base: 1, md: 3 }}>{sessions.map((session) =>
        <Card key={session.id} withBorder><Stack gap="xs">
          <Group justify="space-between"><Text fw={700}>{new Date(session.scheduledStart).toLocaleString()}</Text><Badge variant="light">{session.status}</Badge></Group>
          <Text size="sm">Session {session.id.slice(0, 8)}</Text>
          {session.attendance && <Text size="sm">Attendance: {session.attendance.status}</Text>}
          <Text size="sm" c="dimmed">Instructor: {session.instructorId ?? 'Unassigned'}</Text>
          <Text size="sm" c="dimmed">Room: {session.roomId ?? 'Unassigned'}</Text>
          <Group>
            {session.status === 'SCHEDULED' && <Button variant="light" onClick={() => setSelected(session)}>Attendance</Button>}
            {session.status === 'SCHEDULED' && <Button variant="subtle" onClick={() => setRescheduleOpened(session)}>Request reschedule</Button>}
            {session.status === 'SCHEDULED' && <Button loading={transition.isPending} onClick={() => transition.mutate({ id: session.id, type: 'completeSession' })}>Complete</Button>}
            {session.status === 'SCHEDULED' && <Button color="red" variant="subtle" loading={transition.isPending} onClick={() => transition.mutate({ id: session.id, type: 'cancelSession' })}>Cancel</Button>}
          </Group>
        </Stack></Card>
      )}</SimpleGrid>}
    <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Schedule lesson session"><Stack>
      <Select label="Confirmed enrollment" data={enrollmentData.filter((e) => e.status === 'CONFIRMED').map((e) => ({ value: e.id, label: `${e.studentId} · ${e.lessonPackageId}` }))} value={form.enrollmentId} onChange={(value) => setForm({ ...form, enrollmentId: value })} />
      <Select label="Instructor" clearable data={instructorData.map((i) => ({ value: i.id, label: i.person?.name ?? i.person?.fullName ?? i.personId ?? i.id }))} value={form.instructorId} onChange={(value) => setForm({ ...form, instructorId: value })} />
      <Select label="Room" clearable data={roomData.map((r) => ({ value: r.id, label: r.roomType ?? r.resourceId ?? r.id }))} value={form.roomId} onChange={(value) => setForm({ ...form, roomId: value })} />
      <TextInput label="Start" type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.currentTarget.value })} />
      <TextInput label="End" type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.currentTarget.value })} />
      <Button loading={create.isPending} disabled={!form.enrollmentId || !form.scheduledStart || !form.scheduledEnd} onClick={() => create.mutate({ ...form, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() })}>Schedule</Button>
    </Stack></Modal>
    <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Mark attendance"><Stack>
      <Select label="Attendance" data={['PRESENT','ABSENT','LATE','EXCUSED']} value={status} onChange={(value) => setStatus(value || 'PRESENT')} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
      <Button loading={attendance.isPending} onClick={() => attendance.mutate({ id: selected.id, value: { status, notes: notes || undefined } })}>Save attendance</Button>
    </Stack></Modal>
    <Modal opened={Boolean(rescheduleOpened)} onClose={() => setRescheduleOpened(null)} title="Request reschedule"><Stack>
      <TextInput label="Requested start" type="datetime-local" value={reschedule.requestedStart} onChange={(e) => setReschedule({ ...reschedule, requestedStart: e.currentTarget.value })} />
      <TextInput label="Requested end" type="datetime-local" value={reschedule.requestedEnd} onChange={(e) => setReschedule({ ...reschedule, requestedEnd: e.currentTarget.value })} />
      <Textarea label="Reason" value={reschedule.reason} onChange={(e) => setReschedule({ ...reschedule, reason: e.currentTarget.value })} />
      <Button loading={request.isPending} disabled={!reschedule.requestedStart || !reschedule.requestedEnd} onClick={() => request.mutate({ sessionId: rescheduleOpened.id, requestedStart: new Date(reschedule.requestedStart).toISOString(), requestedEnd: new Date(reschedule.requestedEnd).toISOString(), reason: reschedule.reason || undefined })}>Submit request</Button>
    </Stack></Modal>
  </Stack>
}
