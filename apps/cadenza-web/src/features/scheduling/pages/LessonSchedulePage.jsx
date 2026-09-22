import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const sessions = [
  { time: '09:00', student: 'Student', lesson: 'Beginner Guitar', instructor: 'Instructor', room: 'Room 1', status: 'Scheduled' },
  { time: '11:00', student: 'Student', lesson: 'Piano Fundamentals', instructor: 'Instructor', room: 'Room 2', status: 'Scheduled' },
  { time: '14:00', student: 'Student', lesson: 'Vocal Coaching', instructor: 'Instructor', room: 'Room 1', status: 'Pending' },
]

export default function LessonSchedulePage() {
  return <Stack gap="lg">
    <div><Title order={2}>Lesson Schedule</Title><Text c="dimmed">Manage scheduled sessions, rooms, and instructor assignments.</Text></div>
    <SimpleGrid cols={{ base: 1, md: 3 }}>{sessions.map(s => <Card key={s.time} withBorder>
      <Stack gap="xs"><Group justify="space-between"><Text fw={700}>{s.time}</Text><Badge variant="light">{s.status}</Badge></Group><Text>{s.lesson}</Text><Text size="sm" c="dimmed">{s.student}</Text><Text size="sm">Instructor: {s.instructor}</Text><Text size="sm">Room: {s.room}</Text></Stack>
    </Card>)}</SimpleGrid>
  </Stack>
}
