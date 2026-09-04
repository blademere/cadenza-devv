import { useMemo, useState } from 'react'
import { Alert, Button, Group, Stack, Text, Textarea } from '@mantine/core'
import { CalendarBlank, CheckCircle } from '@phosphor-icons/react'
import { permissions } from '../../../config/permissions'
import PermissionGate from '../../authorization/components/PermissionGate'
import LoadingState from '../../../components/common/LoadingState'
import { useAppointmentTypes, useAvailableAppointmentSlots } from '../queries/submission-appointments.queries'
import { useScheduleSubmissionAppointment } from '../mutations/submission-appointments.mutations'

const SUBMISSION_APPOINTMENT_TYPE_KEY = 'obo-hardcopy-submission'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const unwrapped = unwrap(value)
  if (Array.isArray(unwrapped)) return unwrapped
  if (Array.isArray(unwrapped?.items)) return unwrapped.items
  if (Array.isArray(unwrapped?.data)) return unwrapped.data
  return []
}
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const dayKey = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function SubmissionAppointmentScheduler({ applicationId }) {
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [notes, setNotes] = useState('')
  const typesQuery = useAppointmentTypes()
  const appointmentTypes = asArray(typesQuery.data)
  const submissionType = appointmentTypes.find(
    (type) => type.key === SUBMISSION_APPOINTMENT_TYPE_KEY && type.isActive !== false,
  )
  const appointmentTypeId = submissionType?.id ?? null
  const slotsQuery = useAvailableAppointmentSlots(
    { appointmentTypeId },
    { enabled: Boolean(appointmentTypeId) },
  )
  const scheduleMutation = useScheduleSubmissionAppointment(applicationId)
  const slots = useMemo(
    () => asArray(slotsQuery.data)
      .filter((slot) => slot.status === 'OPEN')
      .filter((slot) => new Date(slot.startsAt) > new Date()),
    [slotsQuery.data],
  )
  const groupedSlots = useMemo(
    () => slots.reduce((groups, slot) => {
      const key = dayKey(slot.startsAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(slot)
      return groups
    }, {}),
    [slots],
  )

  const submit = async () => {
    if (!appointmentTypeId || !selectedSlotId) return
    await scheduleMutation.mutateAsync({
      appointmentTypeId,
      slotId: selectedSlotId,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
  }

  return (
    <PermissionGate
      permission={permissions.planPermits.scheduleSubmission}
      fallback={<Alert color="gray" title="Scheduling unavailable">You do not have permission to schedule a submission appointment.</Alert>}
    >
      <Stack className="obo-panel" p="lg" gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={3}>
            <Text fw={700}>Schedule submission appointment</Text>
            <Text size="sm" c="dimmed">Select an available hardcopy submission slot for this application.</Text>
          </Stack>
          <CalendarBlank size={24} weight="regular" aria-hidden />
        </Group>

        {typesQuery.isLoading ? <LoadingState label="Loading appointment types…" /> : null}
        {typesQuery.error ? <Alert color="red" title="Unable to load appointment types">{typesQuery.error.message}</Alert> : null}
        {!typesQuery.isLoading && !typesQuery.error && !submissionType ? (
          <Alert color="yellow" title="Submission appointments are unavailable">
            The configured hardcopy submission appointment type is not active or could not be found.
          </Alert>
        ) : null}

        {appointmentTypeId ? (
          <Stack gap="sm">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">Appointment type</Text>
                <Text fw={600}>{submissionType.name}</Text>
              </Stack>
              <Text size="xs" c="dimmed">{SUBMISSION_APPOINTMENT_TYPE_KEY}</Text>
            </Group>

            <Text fw={600}>Available slots</Text>
            {slotsQuery.isLoading ? <LoadingState label="Loading available slots…" /> : null}
            {slotsQuery.error ? <Alert color="red" title="Unable to load available slots">{slotsQuery.error.message}</Alert> : null}
            {!slotsQuery.isLoading && !slotsQuery.error && slots.length === 0 ? (
              <Alert color="gray" title="No available slots">There are currently no open submission slots. Please check again later.</Alert>
            ) : null}
            {Object.entries(groupedSlots).map(([date, dateSlots]) => (
              <Stack key={date} gap="xs">
                <Text size="sm" fw={600}>{formatDate(dateSlots[0].startsAt)}</Text>
                <Group gap="sm">
                  {dateSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlotId === slot.id ? 'filled' : 'light'}
                      leftSection={selectedSlotId === slot.id ? <CheckCircle size={16} aria-hidden /> : undefined}
                      onClick={() => setSelectedSlotId(slot.id)}
                      disabled={scheduleMutation.isPending}
                    >
                      {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                    </Button>
                  ))}
                </Group>
              </Stack>
            ))}
          </Stack>
        ) : null}

        <Textarea
          label="Notes"
          description="Optional information for the appointment."
          placeholder="Add any relevant notes"
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
          maxLength={2000}
          disabled={scheduleMutation.isPending}
        />

        {scheduleMutation.error ? <Alert color="red" title="Unable to schedule appointment">{scheduleMutation.error.message}</Alert> : null}
        {scheduleMutation.isSuccess ? <Alert color="green" title="Appointment confirmed">Your hardcopy submission appointment has been scheduled.</Alert> : null}

        <Group justify="flex-end">
          <Button
            onClick={submit}
            loading={scheduleMutation.isPending}
            disabled={!appointmentTypeId || !selectedSlotId || slotsQuery.isLoading || Boolean(scheduleMutation.isSuccess)}
          >
            Confirm appointment
          </Button>
        </Group>
      </Stack>
    </PermissionGate>
  )
}
