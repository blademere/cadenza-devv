import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const roles = [
  { name: 'Front Desk', role: 'Front desk' },
  { name: 'Instructor', role: 'Instructor' },
  { name: 'Student', role: 'Student' },
  { name: 'Administrator', role: 'Admin' },
]

export default function UsersPage() {
  return <Stack gap="lg">
    <div><Title order={2}>Users</Title><Text c="dimmed">Cadenza staff, instructors, students, and administrative users.</Text></div>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>{roles.map(r => <Card key={r.name} withBorder><Group justify="space-between"><div><Text fw={600}>{r.name}</Text><Text size="sm" c="dimmed">{r.role}</Text></div><Badge variant="light">{r.role}</Badge></Group></Card>)}</SimpleGrid>
  </Stack>
}
