import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { studentsApi } from '../../students/api/students.api'
import { instructorsApi } from '../../instructors/api/instructors.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function UsersPage() {
  const students = useQuery({ queryKey: ['cadenza', 'students'], queryFn: studentsApi.list })
  const instructors = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list })
  if (students.isLoading || instructors.isLoading) return <LoadingState label="Loading Cadenza people…" rows={4} />
  const error = students.error || instructors.error
  if (error) return <Alert color="red" title="Unable to load people">{error.message}</Alert>
  const entries = [
    ...unwrap(students.data).map((item) => ({ ...item, role: 'Student' })),
    ...unwrap(instructors.data).map((item) => ({ ...item, role: 'Instructor' })),
  ]
  return <Stack gap="lg">
    <div><Title order={2}>Users</Title><Text c="dimmed">Cadenza students and instructors.</Text></div>
    {!entries.length ? <Alert color="gray" title="No people">No Cadenza students or instructors have been registered yet.</Alert> :
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{entries.map((item) =>
        <Card key={item.id} withBorder><Group justify="space-between"><div>
          <Text fw={600}>{item.person?.name ?? item.person?.fullName ?? item.personId ?? item.id}</Text>
          {item.specialty && <Text size="sm" c="dimmed">{item.specialty}</Text>}
        </div><Badge variant="light">{item.role}</Badge></Group></Card>
      )}</SimpleGrid>}
  </Stack>
}
