import { useQuery } from '@tanstack/react-query'
import { Badge, Card, Group, SimpleGrid, Stack, Text, Title, Alert } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { schedulingApi } from '../api/scheduling.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function LessonSchedulePage() {
  const query = useQuery({ queryKey: ['cadenza', 'lesson-sessions'], queryFn: schedulingApi.listSessions })

  if (query.isLoading) return <LoadingState label="Loading lesson schedule…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load lesson schedule">{query.error.message}</Alert>

  const sessions = unwrap(query.data)

  return (
    <Stack gap="lg">
      <div><Title order={2}>Lesson Schedule</Title><Text c="dimmed">Manage scheduled sessions, rooms, and instructor assignments.</Text></div>
      {!sessions.length ? <Alert color="gray" title="No scheduled sessions">Confirmed lesson enrollments can be scheduled here.</Alert> : (
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          {sessions.map((session) => (
            <Card key={session.id} withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={700}>{new Date(session.scheduledStart).toLocaleString()}</Text>
                  <Badge variant="light">{session.status}</Badge>
                </Group>
                <Text size="sm">Session {session.id.slice(0, 8)}</Text>
                {session.attendance && <Text size="sm">Attendance: {session.attendance.status}</Text>}
                <Text size="sm" c="dimmed">Instructor: {session.instructorId ?? 'Unassigned'}</Text>
                <Text size="sm" c="dimmed">Room: {session.roomId ?? 'Unassigned'}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
