import { useMemo, useState } from 'react'
import { Alert, Button, Group, NumberInput, Select, SimpleGrid, Stack, Tabs, Text, TextInput } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import {
  useAppointmentManagementMine,
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

const toIso = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function AppointmentsPage() {
  const [typeForm, setTypeForm] = useState({ key: '', name: '', description: '', defaultDurationMinutes: 30, defaultCapacity: 1 })
  const [schedule, setSchedule] = useState({ appointmentTypeId: '', dayOfWeek: '1', startTime: '08:00', endTime: '17:00', timezone: 'UTC', slotDurationMinutes: 30, capacity: 1 })
  const [slot, setSlot] = useState({ appointmentTypeId: '', startsAt: '', endsAt: '', capacity: 1 })
  const [generation, setGeneration] = useState({ appointmentTypeId: '', from: '', to: '', scheduleId: '' })
  const [status, setStatus] = useState('')

  const typesQuery = useAppointmentManagementTypes()
  const appointmentsQuery = useAppointmentManagementMine()
  const slotsQuery = useAppointmentManagementSlots({ status: status || undefined })

  const createType = useCreateAppointmentType()
  const createSchedule = useCreateAppointmentSchedule()
  const createSlot = useCreateAppointmentSlot()
  const generateSlots = useGenerateAppointmentSlots()
  const cancel = useCancelAppointment()
  const checkIn = useCheckInAppointment()
  const noShow = useNoShowAppointment()
  const complete = useCompleteAppointment()

  const types = asArray(typesQuery.data)
  const appointments = asArray(appointmentsQuery.data)
  const slots = asArray(slotsQuery.data)
  const typeOptions = useMemo(() => types.map((type) => ({ value: type.id, label: `${type.name} (${type.key})` })), [types])

  const action = async (mutation, id) => {
    await mutation.mutateAsync(id)
  }

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
    await createSlot.mutateAsync({ appointmentTypeId: slot.appointmentTypeId, startsAt, endsAt, capacity: Number(slot.capacity) })
    setSlot((current) => ({ ...current, startsAt: '', endsAt: '' }))
  }

  const generateSlotsAction = async () => {
    const from = toIso(generation.from)
    const to = toIso(generation.to)
    if (!generation.appointmentTypeId || !from || !to || to <= from) return
    await generateSlots.mutateAsync({ appointmentTypeId: generation.appointmentTypeId, from, to, ...(generation.scheduleId ? { scheduleId: generation.scheduleId } : {}) })
  }

  return (
    <PermissionGate
      permission={permissions.appointments.manage}
      fallback={<Stack className="obo-page"><Alert color="gray" title="Access denied">You do not have permission to manage appointments.</Alert></Stack>}
    >
      <Stack className="obo-page">
        <PageHeader eyebrow="Operations / Appointments" title="Appointments" description="Manage appointment types, availability, bookable slots, and appointment actions from one feature." />

        {(createType.error || createSchedule.error || createSlot.error || generateSlots.error || cancel.error || checkIn.error || noShow.error || complete.error) ? (
          <Alert color="red" title="Appointment action failed">{(createType.error || createSchedule.error || createSlot.error || generateSlots.error || cancel.error || checkIn.error || noShow.error || complete.error).message}</Alert>
        ) : null}

        <Tabs defaultValue="types">
          <Tabs.List>
            <Tabs.Tab value="types">Appointment types</Tabs.Tab>
            <Tabs.Tab value="schedules">Schedules</Tabs.Tab>
            <Tabs.Tab value="slots">Slots</Tabs.Tab>
            <Tabs.Tab value="appointments">Appointments</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="types" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <Text fw={700}>Create appointment type</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Key" placeholder="obo-hardcopy-submission" value={typeForm.key} onChange={(e) => setTypeForm({ ...typeForm, key: e.currentTarget.value })} />
                <TextInput label="Name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.currentTarget.value })} />
                <TextInput label="Description" value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.currentTarget.value })} />
                <NumberInput label="Default duration (minutes)" min={1} value={typeForm.defaultDurationMinutes} onChange={(value) => setTypeForm({ ...typeForm, defaultDurationMinutes: Number(value) || 1 })} />
                <NumberInput label="Default capacity" min={1} value={typeForm.defaultCapacity} onChange={(value) => setTypeForm({ ...typeForm, defaultCapacity: Number(value) || 1 })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button onClick={createTypeAction} loading={createType.isPending}>Create type</Button></Group>
              {typesQuery.isLoading ? <LoadingState label="Loading appointment types…" /> : null}
              {types.map((type) => <Group key={type.id} justify="space-between"><Text fw={600}>{type.name}</Text><Text size="sm" c="dimmed">{type.key} · {type.defaultDurationMinutes} min · capacity {type.defaultCapacity}</Text></Group>)}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="schedules" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <Text fw={700}>Create recurring availability schedule</Text>
              <Select label="Appointment type" data={typeOptions} value={schedule.appointmentTypeId || null} onChange={(value) => setSchedule({ ...schedule, appointmentTypeId: value || '' })} searchable />
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Select label="Day of week" data={[['0', 'Sunday'], ['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday']].map(([value, label]) => ({ value, label }))} value={schedule.dayOfWeek} onChange={(value) => setSchedule({ ...schedule, dayOfWeek: value || '1' })} />
                <TextInput label="Start time" type="time" value={schedule.startTime} onChange={(e) => setSchedule({ ...schedule, startTime: e.currentTarget.value })} />
                <TextInput label="End time" type="time" value={schedule.endTime} onChange={(e) => setSchedule({ ...schedule, endTime: e.currentTarget.value })} />
                <TextInput label="Timezone" value={schedule.timezone} onChange={(e) => setSchedule({ ...schedule, timezone: e.currentTarget.value })} />
                <NumberInput label="Slot duration (minutes)" min={1} value={schedule.slotDurationMinutes} onChange={(value) => setSchedule({ ...schedule, slotDurationMinutes: Number(value) || 1 })} />
                <NumberInput label="Capacity" min={1} value={schedule.capacity} onChange={(value) => setSchedule({ ...schedule, capacity: Number(value) || 1 })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button onClick={createScheduleAction} loading={createSchedule.isPending}>Create schedule</Button></Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="slots" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <Text fw={700}>Create or generate bookable slots</Text>
              <Select label="Appointment type" data={typeOptions} value={slot.appointmentTypeId || null} onChange={(value) => setSlot({ ...slot, appointmentTypeId: value || '' })} searchable />
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TextInput label="Starts at" type="datetime-local" value={slot.startsAt} onChange={(e) => setSlot({ ...slot, startsAt: e.currentTarget.value })} />
                <TextInput label="Ends at" type="datetime-local" value={slot.endsAt} onChange={(e) => setSlot({ ...slot, endsAt: e.currentTarget.value })} />
                <NumberInput label="Capacity" min={1} value={slot.capacity} onChange={(value) => setSlot({ ...slot, capacity: Number(value) || 1 })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button onClick={createSlotAction} loading={createSlot.isPending}>Create slot</Button></Group>
              <Text fw={700} mt="md">Generate slots from a schedule</Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Select label="Appointment type" data={typeOptions} value={generation.appointmentTypeId || null} onChange={(value) => setGeneration({ ...generation, appointmentTypeId: value || '' })} searchable />
                <TextInput label="From" type="datetime-local" value={generation.from} onChange={(e) => setGeneration({ ...generation, from: e.currentTarget.value })} />
                <TextInput label="To" type="datetime-local" value={generation.to} onChange={(e) => setGeneration({ ...generation, to: e.currentTarget.value })} />
              </SimpleGrid>
              <Group justify="flex-end"><Button variant="default" onClick={generateSlotsAction} loading={generateSlots.isPending}>Generate slots</Button></Group>
              <Group justify="space-between" mt="md"><Text fw={700}>Slots</Text><Select w={160} placeholder="All statuses" clearable data={['OPEN', 'FULL', 'CLOSED'].map((value) => ({ value, label: value }))} value={status || null} onChange={(value) => setStatus(value || '')} /></Group>
              {slotsQuery.isLoading ? <LoadingState label="Loading slots…" /> : null}
              {slots.map((item) => <Group key={item.id} justify="space-between"><Stack gap={2}><Text fw={600}>{formatDateTime(item.startsAt)} – {formatDateTime(item.endsAt)}</Text><Text size="sm" c="dimmed">{types.find((type) => type.id === item.appointmentTypeId)?.name ?? 'Appointment type'} · {item.bookedCount ?? 0}/{item.capacity}</Text></Stack><StatusChip status={item.status} /></Group>)}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appointments" pt="lg">
            <Stack className="obo-panel" p="lg" gap="md">
              <Text fw={700}>Appointments</Text>
              <Text size="sm" c="dimmed">Appointments returned by the current account. Status actions use the existing appointment API and authorization rules.</Text>
              {appointmentsQuery.isLoading ? <LoadingState label="Loading appointments…" /> : null}
              {!appointmentsQuery.isLoading && appointments.length === 0 ? <Alert color="gray" title="No appointments">No appointments are available for this account.</Alert> : null}
              {appointments.map((item) => (
                <Stack key={item.id} className="obo-panel" p="md" gap="xs">
                  <Group justify="space-between"><Text fw={700}>{item.referenceNumber ?? item.id}</Text><StatusChip status={item.status} /></Group>
                  <Text size="sm">{item.appointmentType?.name ?? 'Appointment'} · {formatDateTime(item.slot?.startsAt)}</Text>
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
