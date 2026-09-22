import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { studentsApi } from '../../students/api/students.api'
import { instructorsApi } from '../../instructors/api/instructors.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function UsersPage() {
  const client = useQueryClient()
  const students = useQuery({ queryKey: ['cadenza', 'students'], queryFn: studentsApi.list })
  const instructors = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list })
  const [editing, setEditing] = useState(null)
  const updateStudent = useMutation({ mutationFn: ({ id, status }) => studentsApi.update(id, { status }), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'students'] }) } })
  const updateInstructor = useMutation({ mutationFn: ({ id, status, specialty }) => instructorsApi.update(id, { status, specialty }), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'instructors'] }) } })
  const register = useMutation({ mutationFn: studentsApi.registerMe, onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'students'] }) })
  if (students.isLoading || instructors.isLoading) return <LoadingState label="Loading Cadenza people…" rows={4} />
  const error = students.error || instructors.error || register.error
  if (error) return <Alert color="red" title="People operation failed">{error.message}</Alert>
  const studentRows = unwrap(students.data)
  const entries = [...studentRows.map((item) => ({ ...item, role: 'Student' })), ...unwrap(instructors.data).map((item) => ({ ...item, role: 'Instructor' }))]
  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Users</Title><Text c="dimmed">Cadenza students and instructors.</Text></div><Button loading={register.isPending} onClick={() => register.mutate()}>Register my account as student</Button></Group>
    {!entries.length ? <Alert color="gray" title="No people">No Cadenza students or instructors have been registered yet.</Alert> :
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{entries.map((item) =>
        <Card key={item.id} withBorder><Group justify="space-between"><div><Text fw={600}>{item.person?.name ?? item.person?.fullName ?? item.personId ?? item.id}</Text>{item.specialty && <Text size="sm" c="dimmed">{item.specialty}</Text>}</div><Badge variant="light">{item.role}</Badge><Button size="xs" variant="subtle" onClick={() => setEditing(item)}>Edit</Button></Group></Card>
      )}</SimpleGrid>}
  </Stack>
}
