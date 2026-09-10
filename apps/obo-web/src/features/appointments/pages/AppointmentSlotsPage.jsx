import { useMemo, useState } from 'react'
import { Alert, Button, Group, NumberInput, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { CalendarPlus } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useAppointmentManagementSlots, useAppointmentManagementTypes } from '../queries/appointments.queries'
import { useCreateAppointmentSlot } from '../mutations/appointments.mutations'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const data = unwrap(value)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  return []
}

const toIsoDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function AppointmentSlotsPage() {
  const [appointmentTypeId, setAppointmentTypeId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [capacity, setCapacity] = useState(1)

  const typesQuery = useAppointmentManagementTypes()
  const appointmentTypes = asArray(typesQuery.data)
  const slotsQuery = useAppointmentManagementSlots(
    { appointmentTypeId: appointmentTypeId || undefined, status: undefined },
    { enabled: !typesQuery.isLoading && !typesQuery.error },
  )
  const createMutation = useCreateAppointmentSlot()

  const typeOptions = useMemo(
    () => appointmentTypes.map((type) => ({ value: type.id, label: `${type.name} (${type.key})` })),
    [appointmentTypes],
  )

  const slots = useMemo(
    () => asArray(slotsQuery.data)
      .filter((slot) => slot.status === 'OPEN')
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [slotsQuery.data],
  )

  const reset = () => {
    setStartsAt('')
    setEndsAt('')
    setCapacity(1)
  }

  const submit = async () => {
    const start = toIsoDate(startsAt)
    const end = toIsoDate(endsAt)
    if (!appointmentTypeId || !start || !end || end <= start || !capacity) return

    await createMutation.mutateAsync({
      appointmentTypeId,
      startsAt: start,
      endsAt: end,
      capacity: Number(capacity),
    })
    reset()
  }

  const start = toIsoDate(startsAt)
  const end = toIsoDate(endsAt)
  const invalidRange = start && end && end <= start

  return (
    <PermissionGate
      permission={permissions.appointments.manage}
      fallback={<Stack className="obo-page"><Alert color="gray" title="Access denied">You do not have permission to manage appointment slots.</Alert></Stack>}
    >
      <Stack className="obo-page">
        <PageHeader
          eyebrow="Operations / Appointments"
          title="Appointment Slots"
          description="Create the concrete dates and times that clients can select when booking an appointment."
        />

        <Stack className="obo-panel" p="lg" gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={3}>
              <Text fw={700}>Create appointment slot</Text>
              <Text size="sm" c="dimmed">Slots are the bookable units. The appointment type controls what the slot is used for.</Text>
            </Stack>
            <CalendarPlus size={24} aria-hidden />
          </Group>

          {typesQuery.isLoading ? <LoadingState label="Loading appointment types…" /> : null}
          {typesQuery.error ? <Alert color="red" title="Unable to load appointment types">{typesQuery.error.message}</Alert> : null}

          {!typesQuery.isLoading && !typesQuery.error && typeOptions.length === 0 ? (
            <Alert color="yellow" title="No appointment types available">Create an active appointment type before creating slots.</Alert>
          ) : null}

          {typeOptions.length > 0 ? (
            <Stack gap="md">
              <Select
                label="Appointment type"
                placeholder="Select an appointment type"
                data={typeOptions}
                value={appointmentTypeId || null}
                onChange={(value) => setAppointmentTypeId(value ?? '')}
                searchable
                disabled={createMutation.isPending}
                required
              />

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Starts at"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.currentTarget.value)}
                  disabled={createMutation.isPending}
                  required
                />
                <TextInput
                  label="Ends at"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.currentTarget.value)}
                  error={invalidRange ? 'End time must be after start time.' : undefined}
                  disabled={createMutation.isPending}
                  required
                />
              </SimpleGrid>

              <NumberInput
                label="Capacity"
                description="Maximum number of clients that can book this slot."
                min={1}
                max={10000}
                value={capacity}
                onChange={(value) => setCapacity(Number(value) || 0)}
                disabled={createMutation.isPending}
                required
              />

              {createMutation.error ? <Alert color="red" title="Unable to create slot">{createMutation.error.message}</Alert> : null}
              {createMutation.isSuccess ? <Alert color="green" title="Slot created">The appointment slot is now available for client booking.</Alert> : null}

              <Group justify="flex-end">
                <Button variant="default" onClick={reset} disabled={createMutation.isPending}>Clear</Button>
                <Button
                  onClick={submit}
                  loading={createMutation.isPending}
                  disabled={!appointmentTypeId || !start || !end || Boolean(invalidRange) || capacity < 1}
                >
                  Create slot
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Stack>

        <Stack className="obo-panel" p="lg" gap="md">
          <Stack gap={3}>
            <Text fw={700}>Open appointment slots</Text>
            <Text size="sm" c="dimmed">These are the slots currently available for client selection.</Text>
          </Stack>

          {slotsQuery.isLoading ? <LoadingState label="Loading appointment slots…" /> : null}
          {slotsQuery.error ? <Alert color="red" title="Unable to load appointment slots">{slotsQuery.error.message}</Alert> : null}
          {!slotsQuery.isLoading && !slotsQuery.error && slots.length === 0 ? (
            <Alert color="gray" title="No open slots">Create an appointment slot to make a schedule available to clients.</Alert>
          ) : null}

          {slots.map((slot) => {
            const type = appointmentTypes.find((item) => item.id === slot.appointmentTypeId)
            return (
              <Group key={slot.id} justify="space-between" align="center" wrap="nowrap">
                <Stack gap={2}>
                  <Text fw={600}>{formatDateTime(slot.startsAt)} – {formatDateTime(slot.endsAt)}</Text>
                  <Text size="sm" c="dimmed">{type?.name ?? 'Appointment type'} · {slot.bookedCount ?? 0}/{slot.capacity} booked</Text>
                </Stack>
                <StatusChip status={slot.status} />
              </Group>
            )
          })}
        </Stack>
      </Stack>
    </PermissionGate>
  )
}
