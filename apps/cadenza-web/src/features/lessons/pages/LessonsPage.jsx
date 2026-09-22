import { Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const packages = [
  { name: 'Beginner Guitar', sessions: 8, duration: '60 min', price: '₱6,000' },
  { name: 'Piano Fundamentals', sessions: 8, duration: '60 min', price: '₱6,500' },
  { name: 'Vocal Coaching', sessions: 4, duration: '60 min', price: '₱3,500' },
]

export default function LessonsPage() {
  return <Stack gap="lg">
    <Group justify="space-between">
      <div><Title order={2}>Music Lessons</Title><Text c="dimmed">Lesson packages and student enrollments.</Text></div>
      <Button>Create lesson package</Button>
    </Group>
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {packages.map(p => <Card key={p.name} withBorder radius="md" padding="lg">
        <Stack gap="sm"><Title order={4}>{p.name}</Title><Text c="dimmed">{p.sessions} sessions · {p.duration} each</Text><Text fw={700} size="lg">{p.price}</Text><Button variant="light">View package</Button></Stack>
      </Card>)}
    </SimpleGrid>
  </Stack>
}
