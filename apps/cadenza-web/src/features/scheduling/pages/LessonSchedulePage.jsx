import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, Select, SimpleGrid, Stack, Text, Textarea, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { schedulingApi } from '../api/scheduling.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function LessonSchedulePage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['cadenza', 'lesson-sessions'], queryFn: schedulingApi.listSessions })
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('PRESENT')
  const [notes, setNotes] = useState('')
  const attendance = useMutation({
    mutationFn: ({ id, value }) => schedulingApi.markAttendance(id, value),
    onSuccess: () => { setSelected(null); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-sessions'] }) },
  })
  const transition = useMutation({
    mutationFn: ({ id, type }) => schedulingApi[type](id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'lesson-sessions'] }),
  })
  if (query.isLoading) return <LoadingState label="Loading lesson schedule…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load lesson schedule">{query.error.message}</Alert>
  const sessions = unwrap(query.data)
  return <Stack gap="lg">
    <div><Title order={2}>Lesson Schedule</Title><Text c="dimmed">Manage scheduled sessions, rooms, instructor assignments, attendance, and session lifecycle.</Text></div>
    {(attendance.error || transition.error) && <Alert color="red" title="Schedule operation failed">{(attendance.error || transition.error).message}</Alert>}
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
            {session.status === 'SCHEDULED' && <Button loading={transition.isPending} onClick={() => transition.mutate({ id: session.id, type: 'completeSession' })}>Complete</Button>}
            {session.status === 'SCHEDULED' && <Button color="red" variant="subtle" loading={transition.isPending} onClick={() => transition.mutate({ id: session.id, type: 'cancelSession' })}>Cancel</Button>}
          </Group>
        </Stack></Card>
      )}</SimpleGrid>}
    <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Mark attendance">
      <Stack>
        <Select label="Attendance" data={['PRESENT','ABSENT','LATE','EXCUSED']} value={status} onChange={(value) => setStatus(value || 'PRESENT')} />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
        <Button loading={attendance.isPending} onClick={() => attendance.mutate({ id: selected.id, value: { status, notes: notes || undefined } })}>Save attendance</Button>
      </Stack>
    </Modal>
  </Stack>
}
