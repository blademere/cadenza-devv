import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, NumberInput, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { lessonsApi } from '../api/lessons.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function LessonsPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })
  const [opened, setOpened] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', numberOfSessions: 1 })
  const mutation = useMutation({
    mutationFn: lessonsApi.createPackage,
    onSuccess: () => { setOpened(false); setForm({ name: '', description: '', price: '', numberOfSessions: 1 }); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] }) },
  })
  if (query.isLoading) return <LoadingState label="Loading lesson packages…" rows={3} />
  if (query.error) return <Alert color="red" title="Unable to load lesson packages">{query.error.message}</Alert>
  const packages = unwrap(query.data)
  const submit = () => mutation.mutate({ ...form, price: String(form.price), numberOfSessions: Number(form.numberOfSessions) })
  return <Stack gap="lg">
    <Group justify="space-between">
      <div><Title order={2}>Music Lessons</Title><Text c="dimmed">Lesson packages and student enrollments.</Text></div>
      <Button onClick={() => setOpened(true)}>Create lesson package</Button>
    </Group>
    {mutation.error && <Alert color="red" title="Unable to create package">{mutation.error.message}</Alert>}
    {!packages.length ? <Alert color="gray" title="No lesson packages">Create a lesson package before accepting enrollments.</Alert> :
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{packages.map((pkg) =>
        <Card key={pkg.id} withBorder radius="md" padding="lg"><Stack gap="sm">
          <Group justify="space-between" align="flex-start"><Title order={4}>{pkg.name}</Title><Badge variant="light">{pkg.status}</Badge></Group>
          <Text c="dimmed">{pkg.numberOfSessions} sessions</Text>
          {pkg.description && <Text size="sm" c="dimmed">{pkg.description}</Text>}
          <Text fw={700} size="lg">₱{Number(pkg.price).toLocaleString()}</Text>
          <Text size="xs" c="dimmed">{pkg._count?.attachments ?? 0} attachment(s)</Text>
        </Stack></Card>
      )}</SimpleGrid>}
    <Modal opened={opened} onClose={() => setOpened(false)} title="Create lesson package">
      <Stack>
        <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
        <NumberInput label="Price" min={0.01} value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
        <NumberInput label="Number of sessions" min={1} value={form.numberOfSessions} onChange={(value) => setForm({ ...form, numberOfSessions: value })} />
        <Button loading={mutation.isPending} disabled={!form.name || !form.price} onClick={submit}>Create package</Button>
      </Stack>
    </Modal>
  </Stack>
}
