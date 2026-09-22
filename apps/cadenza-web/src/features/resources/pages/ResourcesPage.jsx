import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { resourcesApi } from '../api/resources.api'

const unwrap = (response) => response?.data ?? response ?? []

export default function ResourcesPage() {
  const client = useQueryClient()
  const instruments = useQuery({ queryKey: ['cadenza', 'instruments'], queryFn: resourcesApi.listInstruments })
  const rooms = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms })
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ kind: 'INSTRUMENT', key: '', name: '', type: 'CADENZA_INSTRUMENT', instrumentType: '', roomType: '', capacity: 1, rentalRate: '', brand: '', model: '', serialNumber: '' })
  const createResource = useMutation({ mutationFn: resourcesApi.createResource })
  const createInstrument = useMutation({ mutationFn: resourcesApi.createInstrument, onSuccess: () => { setOpened(false); client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }); client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }) } })
  const updateInstrument = useMutation({ mutationFn: ({ id, payload }) => resourcesApi.updateInstrument(id, payload), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }) } })
  const updateRoom = useMutation({ mutationFn: ({ id, payload }) => resourcesApi.updateRoom(id, payload), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }) } })
  const createRoom = useMutation({ mutationFn: resourcesApi.createRoom, onSuccess: () => { setOpened(false); client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }); client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }) } })
  if (instruments.isLoading || rooms.isLoading) return <LoadingState label="Loading Cadenza resources…" rows={3} />
  const error = instruments.error || rooms.error || createResource.error || createInstrument.error || createRoom.error
  const entries = [...unwrap(instruments.data).map((item) => ({ ...item, resourceType: 'Instrument', label: item.instrumentType })), ...unwrap(rooms.data).map((item) => ({ ...item, resourceType: 'Room', label: item.roomType }))]
  const submit = async () => {
    const resource = await createResource.mutateAsync({ key: form.key, name: form.name, type: form.type })
    const resourceId = resource?.data?.id ?? resource?.id
    if (!resourceId) throw new Error('Resource creation did not return a resource id.')
    if (form.kind === 'INSTRUMENT') {
      createInstrument.mutate({ resourceId, instrumentType: form.instrumentType, brand: form.brand || undefined, model: form.model || undefined, serialNumber: form.serialNumber || undefined, rentalRate: String(form.rentalRate) })
    } else {
      createRoom.mutate({ resourceId, roomType: form.roomType, capacity: Number(form.capacity), rentalRate: String(form.rentalRate) })
    }
  }
  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Resources</Title><Text c="dimmed">Manage Cadenza-owned instruments and rooms using the reusable resource capability.</Text></div><Button onClick={() => setOpened(true)}>Add resource</Button></Group>
    {error && <Alert color="red" title="Resource operation failed">{error.message}</Alert>}
    {!entries.length ? <Alert color="gray" title="No resources">Add an instrument or band-room resource.</Alert> : <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{entries.map((resource) =>
      <Card key={resource.id} withBorder><Stack gap="xs"><Group justify="space-between"><Title order={4}>{resource.label}</Title><Badge variant="light">{resource.status}</Badge></Group><Text c="dimmed">{resource.resourceType}</Text><Text size="sm">Resource ID: {resource.resourceId}</Text><Text size="sm">Rate: ₱{Number(resource.rentalRate).toLocaleString()}</Text><Button size="xs" variant="light" onClick={() => setEditing(resource)}>Edit</Button></Stack></Card>
    )}</SimpleGrid>}
    <Modal opened={Boolean(editing)} onClose={() => setEditing(null)} title="Update resource"><Stack>
      <Text>Update status and rental rate.</Text>
      <Select label="Status" data={['AVAILABLE','UNAVAILABLE','RETIRED']} value={editing?.status ?? null} onChange={(value) => setEditing({ ...editing, status: value })} />
      <NumberInput label="Rental rate" min={0.01} value={editing?.rentalRate ?? ''} onChange={(value) => setEditing({ ...editing, rentalRate: value })} />
      <Button loading={updateInstrument.isPending || updateRoom.isPending} onClick={() => editing?.resourceType === 'Instrument' ? updateInstrument.mutate({ id: editing.id, payload: { status: editing.status, rentalRate: String(editing.rentalRate) } }) : updateRoom.mutate({ id: editing.id, payload: { status: editing.status, rentalRate: String(editing.rentalRate) } })}>Save</Button>
    </Stack></Modal>
    <Modal opened={opened} onClose={() => setOpened(false)} title="Add Cadenza resource"><Stack>
      <Select label="Resource kind" data={[{ value: 'INSTRUMENT', label: 'Instrument' }, { value: 'ROOM', label: 'Band room' }]} value={form.kind} onChange={(value) => setForm({ ...form, kind: value || 'INSTRUMENT', type: value === 'ROOM' ? 'CADENZA_ROOM' : 'CADENZA_INSTRUMENT' })} />
      <TextInput label="Resource key" required value={form.key} onChange={(e) => setForm({ ...form, key: e.currentTarget.value })} />
      <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
      {form.kind === 'INSTRUMENT' ? <><TextInput label="Instrument type" required value={form.instrumentType} onChange={(e) => setForm({ ...form, instrumentType: e.currentTarget.value })} /><TextInput label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.currentTarget.value })} /><TextInput label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.currentTarget.value })} /><TextInput label="Serial number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.currentTarget.value })} /></> : <><TextInput label="Room type" required value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.currentTarget.value })} /><NumberInput label="Capacity" min={1} value={form.capacity} onChange={(value) => setForm({ ...form, capacity: value })} /></>}
      <NumberInput label="Rental rate" min={0.01} value={form.rentalRate} onChange={(value) => setForm({ ...form, rentalRate: value })} />
      <Button loading={createResource.isPending || createInstrument.isPending || createRoom.isPending} disabled={!form.key || !form.name || !form.rentalRate || (form.kind === 'INSTRUMENT' ? !form.instrumentType : !form.roomType)} onClick={() => submit().catch(() => {})}>Create resource</Button>
    </Stack></Modal>
  </Stack>
}
