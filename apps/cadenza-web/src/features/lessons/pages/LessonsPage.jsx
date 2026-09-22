import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { lessonsApi } from '../api/lessons.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function LessonsPage() {
  const query = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })

  if (query.isLoading) return <LoadingState label="Loading lesson packages…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load lesson packages">{query.error.message}</Alert>

  const packages = unwrap(query.data)

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div><Title order={2}>Music Lessons</Title><Text c="dimmed">Lesson packages and student enrollments.</Text></div>
        <Button>Create lesson package</Button>
      </Group>
      {!packages.length ? <Alert color="gray" title="No lesson packages">Create a lesson package before accepting enrollments.</Alert> : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {packages.map((pkg) => (
            <Card key={pkg.id} withBorder radius="md" padding="lg">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Title order={4}>{pkg.name}</Title>
                  <Badge variant="light">{pkg.status}</Badge>
                </Group>
                <Text c="dimmed">{pkg.numberOfSessions} sessions</Text>
                {pkg.description && <Text size="sm" c="dimmed">{pkg.description}</Text>}
                <Text fw={700} size="lg">₱{Number(pkg.price).toLocaleString()}</Text>
                <Text size="xs" c="dimmed">{pkg._count?.attachments ?? 0} attachment(s)</Text>
                <Button variant="light">View package</Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
