import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Divider, Group, NumberInput, Select, SimpleGrid, Stack, Tabs, Text, TextInput } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import {
  useAppointmentManagement,
  useAppointmentManagementSchedules,
  useAppointmentManagementSlots,
  useAppointmentManagementTypes,
} from '../queries/appointments.queries'
import {
  useCancelAppointment,
  useCheckInAppointment,
  useCompleteAppointment,
  useCreateAppointmentSchedule,
  useCreateAppointmentSlot,
  useCreateAppointmentType,
  useGenerateAppointmentSlots,
  useNoShowAppointment,
} from '../mutations/appointments.mutations'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const data = unwrap(value)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  return []
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const toIso = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function AppointmentsPage() {
  const [typeForm, setTypeForm] = useState({ key: '', name: '', description: '', defaultDurationMinutes: 30, defaultCapacity: 1 })
  const [schedule, setSchedule] = useState({ appointmentTypeId: '', dayOfWeek: '1', startTime: '08:00', endTime: '17:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', slotDurationMinutes: 30, capacity: 1 })
  const [slot, setSlot] = useState({ appointmentTypeId: '', scheduleId: '', startsAt: '', endsAt: '', capacity: 1 })
  const [generation, setGeneration] = useState({ appointmentTypeId: '', scheduleId: '', from: '', to: '' })
  const [slotStatus, setSlotStatus] = useState('')
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState('')
  const [appointmentStatus, setAppointmentStatus] = useState('')

  const typesQuery = useAppointmentManagementTypes()
  const scheduleQuery = useAppointmentManagementSchedules({ appointmentTypeId: schedule.appointmentTypeId || undefined })
  const slotScheduleQuery = useAppointmentManagementSchedules({ appointmentTypeId: slot.appointmentTypeId || undefined })
  const generationScheduleQuery = useAppointmentManagementSchedules({ appointmentTypeId: generation.appointmentTypeId || undefined })
  const slotsQuery = useAppointmentManagementSlots({ status: slotStatus || undefined, appointmentTypeId: slot.appointmentTypeId || undefined })
  const appointmentsQuery = useAppointmentManagement({ params: { appointmentTypeId: appointmentTypeFilter || undefined, status: appointmentStatus || undefined } })

  const createType = useCreateAppointmentType()
  const createSchedule = useCreateAppointmentSchedule()
  const createSlot = useCreateAppointmentSlot()
  const generateSlots = useGenerateAppointmentSlots()
  const cancel = useCancelAppointment()
  const checkIn = useCheckInAppointment()
  const noShow = useNoShowAppointment()
  const complete = useCompleteAppointment()

  const types = asArray(typesQuery.data)
  const schedules = asArray(scheduleQuery.data)
  const slotSchedules = asArray(slotScheduleQuery.data)
  const generationSchedules = asArray(generationScheduleQuery.data)
  const slots = asArray(slotsQuery.data)
  const appointments = asArray(appointmentsQuery.data)
  const typeOptions = useMemo(() => types.map((type) => ({ value: type.id, label: `${type.name} (${type.key})` })), [types])
  const toScheduleOptions = (items) => items.map((item) => ({ value: item.id, label: `${dayNames[item.dayOfWeek]} · ${item.startTime}–${item.endTime} · ${item.timezone}` }))
  const actionError = createType.error || createSchedule.error || createSlot.error || generateSlots.error || cancel.error || checkIn.error || noShow.error || complete.error

  const action = async (mutation, id) => { await mutation.mutateAsync(id) }

  const createTypeAction = async () => {
    if (!typeForm.key || !typeForm.name) return
    await createType.mutateAsync({ ...typeForm, defaultDurationMinutes: Number(typeForm.defaultDurationMinutes), defaultCapacity: Number(typeForm.defaultCapacity) })
    setTypeForm({ key: '', name: '', description: '', defaultDurationMinutes: 30, defaultCapacity: 1 })
  }

  const createScheduleAction = async () => {
    if (!schedule.appointmentTypeId) return
    await createSchedule.mutateAsync({ ...schedule, dayOfWeek: Number(schedule.dayOfWeek), slotDurationMinutes: Number(schedule.slotDurationMinutes), capacity: Number(schedule.capacity) })
  }

  const createSlotAction = async () => {
    const startsAt = toIso(slot.startsAt)
    const endsAt = toIso(slot.endsAt)
    if (!slot.appointmentTypeId || !startsAt || !endsAt || endsAt <= startsAt) return
    await createSlot.mutateAsync({ appointmentTypeId: slot.appointmentTypeId, ...(slot.scheduleId ? { scheduleId: slot.scheduleId } : {}), startsAt, endsAt, capacity: Number(slot.capacity) })
    setSlot((current) => ({ ...current, startsAt: '', endsAt: '' }))
  }

  const generateSlotsAction = async () => {
    const from = toIso(generation.from)
    const to = toIso(generation.to)
    if (!generation.appointmentTypeId || !from || !to || to <= from) return
    await generateSlots.mutateAsync({ appointmentTypeId: generation.appointmentTypeId, from, to, ...(generation.scheduleId ? { scheduleId: generation.scheduleId } : {}) })
  }

  const updateSlotType = (value) => setSlot((current) => ({ ...current, appointmentTypeId: value || '', scheduleId: '' }))
  const updateGenerationType = (value) => setGeneration((current) => ({ ...current, appointmentTypeId: value || '', scheduleId: '' }))

  return (
    <PermissionGate permission={permissions.appointments.manage} fallback={<Stack className="obo-page"><Alert color="gray" title="Access denied">You do not have permission to manage appointments.</Alert></Stack>}>
      <Stack className="obo-page">
        <PageHeader eyebrow="Operations / Appointments" title="Appointments" description="Configure appointment types, define recurring schedules, generate bookable slots, and manage booked appointments." />
        {actionError ? <Alert color="red" title="Appointment action failed">{actionError.message}</Alert> : null}

        <Tabs defaultValue="types">
          <Tabs.List>
            <Tabs.Tab value="types">1. Appointment types</Tabs.Tab>
            <Tabs.Tab value="schedules">2. Schedules</Tabs.Tab>
            <Tabs.Tab value="slots">3. Slots</Tabs.Tab>
            <Tabs.Tab value="appointments">4. Appointments</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="types" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <BoxedSection title="Create appointment type" description="Define the service that can be scheduled, such as hard-copy submission." />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Key" placeholder="obo-hardcopy-submission" value={typeForm.key} onChange={(e) => setTypeForm({ ...typeForm, key: e.currentTarget.value })} required />
                <TextInput label="Name" placeholder="Hard-copy submission" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.currentTarget.value })} required />
                <TextInput label="Description" placeholder="Physical document submission" value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.currentTarget.value })} />
                <NumberInput label="Default duration (minutes)" min={1} value={typeForm.defaultDurationMinutes} onChange={(value) => setTypeForm({ ...typeForm, defaultDurationMinutes: Number(value) || 1 })} />
                <NumberInput label="Default capacity" min={1} value={typeForm.defaultCapacity} onChange={(value) => setTypeForm({ ...typeForm, defaultCapacity: Number(value) || 1 })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button onClick={createTypeAction} loading={createType.isPending} disabled={!typeForm.key || !typeForm.name}>Create type</Button></Group>
              <DividerLabel label="Configured appointment types" />
              {typesQuery.isLoading ? <LoadingState label="Loading appointment types…" /> : null}
              {!typesQuery.isLoading && types.length === 0 ? <Alert color="gray" title="No appointment types">Create an appointment type before creating schedules or slots.</Alert> : null}
              {types.map((type) => <BoxedRow key={type.id}><div><Text fw={600}>{type.name}</Text><Text size="sm" c="dimmed">{type.key} · {type.description || 'No description'}</Text></div><Badge variant="light">{type.isActive ? 'Active' : 'Inactive'}</Badge></BoxedRow>)}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="schedules" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <BoxedSection title="Define recurring availability" description="A schedule is the rule for when a service is available. It does not book an appointment." />
              <Select label="Appointment type" data={typeOptions} value={schedule.appointmentTypeId || null} onChange={(value) => setSchedule({ ...schedule, appointmentTypeId: value || '' })} searchable required />
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Select label="Day of week" data={dayNames.map((label, value) => ({ value: String(value), label }))} value={schedule.dayOfWeek} onChange={(value) => setSchedule({ ...schedule, dayOfWeek: value || '1' })} />
                <TextInput label="Start time" type="time" value={schedule.startTime} onChange={(e) => setSchedule({ ...schedule, startTime: e.currentTarget.value })} />
                <TextInput label="End time" type="time" value={schedule.endTime} onChange={(e) => setSchedule({ ...schedule, endTime: e.currentTarget.value })} />
                <TextInput label="Timezone" value={schedule.timezone} onChange={(e) => setSchedule({ ...schedule, timezone: e.currentTarget.value })} />
                <NumberInput label="Slot duration (minutes)" min={1} value={schedule.slotDurationMinutes} onChange={(value) => setSchedule({ ...schedule, slotDurationMinutes: Number(value) || 1 })} />
                <NumberInput label="Capacity per slot" min={1} value={schedule.capacity} onChange={(value) => setSchedule({ ...schedule, capacity: Number(value) || 1 })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button onClick={createScheduleAction} loading={createSchedule.isPending} disabled={!schedule.appointmentTypeId}>Create schedule</Button></Group>
              <DividerLabel label="Configured schedules" />
              {scheduleQuery.isLoading ? <LoadingState label="Loading schedules…" /> : null}
              {!scheduleQuery.isLoading && schedules.length === 0 ? <Alert color="gray" title="No schedules">Create a schedule for the selected appointment type.</Alert> : null}
              {schedules.map((item) => <BoxedRow key={item.id}><div><Text fw={600}>{dayNames[item.dayOfWeek]} · {item.startTime}–{item.endTime}</Text><Text size="sm" c="dimmed">{item.timezone} · {item.slotDurationMinutes} minute slots · capacity {item.capacity}</Text></div><Badge variant="light">{item.isActive ? 'Active' : 'Inactive'}</Badge></BoxedRow>)}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="slots" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <BoxedSection title="Create or generate bookable slots" description="A slot is an exact date and time that a client can select. Slots are generated from schedules or can be created individually." />
              <Select label="Appointment type" data={typeOptions} value={slot.appointmentTypeId || null} onChange={updateSlotType} searchable required />
              <Select label="Schedule (optional for manual slots)" data={toScheduleOptions(slotSchedules)} value={slot.scheduleId || null} onChange={(value) => setSlot({ ...slot, scheduleId: value || '' })} searchable clearable disabled={!slot.appointmentTypeId} />
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TextInput label="Starts at" type="datetime-local" value={slot.startsAt} onChange={(e) => setSlot({ ...slot, startsAt: e.currentTarget.value })} />
                <TextInput label="Ends at" type="datetime-local" value={slot.endsAt} onChange={(e) => setSlot({ ...slot, endsAt: e.currentTarget.value })} />
                <NumberInput label="Capacity" min={1} value={slot.capacity} onChange={(value) => setSlot({ ...slot, capacity: Number(value) || 1 })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button onClick={createSlotAction} loading={createSlot.isPending} disabled={!slot.appointmentTypeId || !slot.startsAt || !slot.endsAt}>Create slot</Button></Group>

              <DividerLabel label="Generate from a schedule" />
              <Select label="Appointment type" data={typeOptions} value={generation.appointmentTypeId || null} onChange={updateGenerationType} searchable required />
              <Select label="Schedule" data={toScheduleOptions(generationSchedules)} value={generation.scheduleId || null} onChange={(value) => setGeneration({ ...generation, scheduleId: value || '' })} searchable clearable disabled={!generation.appointmentTypeId} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="From" type="datetime-local" value={generation.from} onChange={(e) => setGeneration({ ...generation, from: e.currentTarget.value })} />
                <TextInput label="To" type="datetime-local" value={generation.to} onChange={(e) => setGeneration({ ...generation, to: e.currentTarget.value })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button variant="default" onClick={generateSlotsAction} loading={generateSlots.isPending} disabled={!generation.appointmentTypeId || !generation.from || !generation.to}>Generate slots</Button></Group>

              <DividerLabel label="Bookable slots" />
              <Group justify="space-between"><Text size="sm" c="dimmed">Only slots matching the selected appointment type are shown.</Text><Select w={160} placeholder="All statuses" clearable data={['OPEN', 'FULL', 'CLOSED'].map((value) => ({ value, label: value }))} value={slotStatus || null} onChange={(value) => setSlotStatus(value || '')} /></Group>
              {slotsQuery.isLoading ? <LoadingState label="Loading slots…" /> : null}
              {!slotsQuery.isLoading && slots.length === 0 ? <Alert color="gray" title="No slots">Create or generate slots for this appointment type.</Alert> : null}
              {slots.map((item) => <BoxedRow key={item.id}><div><Text fw={600}>{formatDateTime(item.startsAt)} – {formatDateTime(item.endsAt)}</Text><Text size="sm" c="dimmed">{types.find((type) => type.id === item.appointmentTypeId)?.name ?? 'Appointment type'} · {item.bookedCount ?? 0}/{item.capacity} booked</Text></div><StatusChip status={item.status} /></BoxedRow>)}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appointments" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <BoxedSection title="Manage booked appointments" description="This is the operational appointment list. It is separate from the client-facing scheduler, which only lets a client select an available slot." />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select label="Appointment type" placeholder="All types" clearable searchable data={typeOptions} value={appointmentTypeFilter || null} onChange={(value) => setAppointmentTypeFilter(value || '')} />
                <Select label="Status" placeholder="All statuses" clearable data={['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => ({ value, label: value }))} value={appointmentStatus || null} onChange={(value) => setAppointmentStatus(value || '')} />
              </SimpleGrid>
              {appointmentsQuery.isLoading ? <LoadingState label="Loading appointments…" /> : null}
              {!appointmentsQuery.isLoading && appointments.length === 0 ? <Alert color="gray" title="No appointments">No appointments match the current filters.</Alert> : null}
              {appointments.map((item) => (
                <Stack key={item.id} className="obo-panel" p="md" gap="xs">
                  <Group justify="space-between"><div><Text fw={700}>{item.referenceNumber ?? item.id}</Text><Text size="sm" c="dimmed">User ID: {item.userId ?? '—'}</Text></div><StatusChip status={item.status} /></Group>
                  <Text size="sm">{item.appointmentType?.name ?? 'Appointment'} · {formatDateTime(item.slot?.startsAt)} – {formatDateTime(item.slot?.endsAt)}</Text>
                  {item.notes ? <Text size="sm" c="dimmed">{item.notes}</Text> : null}
                  <Group>
                    {['PENDING', 'CONFIRMED'].includes(item.status) ? <Button size="xs" variant="default" onClick={() => action(cancel, item.id)} loading={cancel.isPending}>Cancel</Button> : null}
                    {item.status === 'CONFIRMED' ? <><Button size="xs" onClick={() => action(checkIn, item.id)} loading={checkIn.isPending}>Check in</Button><Button size="xs" variant="default" onClick={() => action(noShow, item.id)} loading={noShow.isPending}>No-show</Button></> : null}
                    {item.status === 'CHECKED_IN' ? <Button size="xs" onClick={() => action(complete, item.id)} loading={complete.isPending}>Complete</Button> : null}
                  </Group>
                </Stack>
              ))}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </PermissionGate>
  )
}

function BoxedSection({ title, description }) {
  return <Stack gap={2}><Text fw={700}>{title}</Text><Text size="sm" c="dimmed">{description}</Text></Stack>
}

function DividerLabel({ label }) {
  return <Group gap="sm" mt="md"><Text size="sm" fw={700}>{label}</Text><Divider flex={1} /></Group>
}

function BoxedRow({ children }) {
  return <Group justify="space-between" align="center" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-sm)' }}>{children}</Group>
}
