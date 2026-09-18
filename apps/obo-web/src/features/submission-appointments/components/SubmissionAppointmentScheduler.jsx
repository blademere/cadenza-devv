/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Group, Paper, Select, SimpleGrid, Stack, Text, Textarea } from '@mantine/core'
import { CalendarBlank, CheckCircle } from '@phosphor-icons/react'
import { permissions } from '../../../config/permissions'
import PermissionGate from '../../authorization/components/PermissionGate'
import LoadingState from '../../../components/common/LoadingState'
import { useAppointmentTypes, useAvailableAppointmentSlots } from '../queries/submission-appointments.queries'
import { useRescheduleSubmissionAppointment, useScheduleSubmissionAppointment } from '../mutations/submission-appointments.mutations'

const SUBMISSION_APPOINTMENT_TYPE_KEY = 'obo-hardcopy-submission'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const unwrapped = unwrap(value)
  if (Array.isArray(unwrapped)) return unwrapped
  if (Array.isArray(unwrapped?.items)) return unwrapped.items
  if (Array.isArray(unwrapped?.data)) return unwrapped.data
  return []
}
const toDate = (value) => new Date(value)
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(toDate(value))
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(toDate(value))
const dayKey = (value) => {
  const date = toDate(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function SubmissionAppointmentScheduler({ applicationId, reschedule = false }) {
  const [selectedDate, setSelectedDate] = useState('')
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
  const rescheduleMutation = useRescheduleSubmissionAppointment(applicationId)
  const mutation = reschedule ? rescheduleMutation : scheduleMutation

  const slots = useMemo(
    () => asArray(slotsQuery.data)
      .filter((slot) => slot.status === 'OPEN')
      .filter((slot) => toDate(slot.startsAt) > new Date())
      .sort((a, b) => toDate(a.startsAt) - toDate(b.startsAt)),
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

  const dateOptions = useMemo(
    () => Object.entries(groupedSlots).map(([value, dateSlots]) => ({
      value,
      label: formatDate(dateSlots[0].startsAt),
    })),
    [groupedSlots],
  )

  const selectedDateSlots = useMemo(
    () => (selectedDate ? groupedSlots[selectedDate] ?? [] : []),
    [groupedSlots, selectedDate],
  )
  const selectedSlot = selectedDateSlots.find((slot) => slot.id === selectedSlotId) ?? null

  useEffect(() => {
    if (selectedDate && !groupedSlots[selectedDate]) setSelectedDate('')
    if (selectedSlotId && !selectedDateSlots.some((slot) => slot.id === selectedSlotId)) setSelectedSlotId(null)
  }, [groupedSlots, selectedDate, selectedDateSlots, selectedSlotId])

  const selectDate = (value) => {
    setSelectedDate(value ?? '')
    setSelectedSlotId(null)
  }

  const submit = async () => {
    if (!appointmentTypeId || !selectedSlotId) return
    await mutation.mutateAsync({
      appointmentTypeId,
      slotId: selectedSlotId,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
  }

  return (
    <PermissionGate
      permission={permissions.applications.scheduleSubmission}
      fallback={<Alert color="gray" title="Scheduling unavailable">You do not have permission to schedule a submission appointment.</Alert>}
    >
      <Stack className="obo-panel" p="lg" gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={3}>
            <Text fw={700}>{reschedule ? 'Change submission appointment' : 'Schedule submission appointment'}</Text>
            <Text size="sm" c="dimmed">Choose an available date and time for your physical hardcopy submission.</Text>
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
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">Appointment type</Text>
                <Text fw={600}>{submissionType.name}</Text>
              </Stack>
              <Text size="xs" c="dimmed">{SUBMISSION_APPOINTMENT_TYPE_KEY}</Text>
            </Group>

            <Select
              label="Select a date"
              placeholder="Choose an available date"
              data={dateOptions}
              value={selectedDate || null}
              onChange={selectDate}
              searchable
              clearable
              disabled={mutation.isPending || slotsQuery.isLoading || dateOptions.length === 0}
            />

            {slotsQuery.isLoading ? <LoadingState label="Loading available slots…" /> : null}
            {slotsQuery.error ? <Alert color="red" title="Unable to load available slots">{slotsQuery.error.message}</Alert> : null}
            {!slotsQuery.isLoading && !slotsQuery.error && slots.length === 0 ? (
              <Alert color="gray" title="No available dates">There are currently no open submission slots. Please check again later.</Alert>
            ) : null}

            {selectedDate ? (
              <Stack gap="sm">
                <Text fw={600}>Available times</Text>
                {selectedDateSlots.length === 0 ? (
                  <Alert color="gray" title="No available times">There are no remaining times for this date. Choose another date.</Alert>
                ) : (
                  <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }}>
                    {selectedDateSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedSlotId === slot.id ? 'filled' : 'light'}
                        leftSection={selectedSlotId === slot.id ? <CheckCircle size={16} aria-hidden /> : undefined}
                        onClick={() => setSelectedSlotId(slot.id)}
                        disabled={mutation.isPending}
                      >
                        {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                      </Button>
                    ))}
                  </SimpleGrid>
                )}
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        {selectedSlot ? (
          <Paper withBorder p="md" radius="md">
            <Stack gap={4}>
              <Text size="sm" fw={700}>Selected appointment</Text>
              <Text size="sm">{formatDate(selectedSlot.startsAt)}</Text>
              <Text size="sm" c="dimmed">{formatTime(selectedSlot.startsAt)} – {formatTime(selectedSlot.endsAt)}</Text>
            </Stack>
          </Paper>
        ) : null}

        <Textarea
          label="Notes"
          description="Optional information for the appointment."
          placeholder="Add any relevant notes"
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
          maxLength={2000}
          disabled={mutation.isPending}
        />

        {mutation.error ? <Alert color="red" title="Unable to change appointment">{mutation.error.message}</Alert> : null}
        {mutation.isSuccess ? <Alert color="green" title="Appointment confirmed">Your hardcopy submission appointment has been scheduled.</Alert> : null}

        <Group justify="flex-end">
          <Button
            onClick={submit}
            loading={mutation.isPending}
            disabled={!appointmentTypeId || !selectedSlotId || slotsQuery.isLoading || Boolean(mutation.isSuccess)}
          >
            {reschedule ? 'Confirm new schedule' : 'Confirm schedule'}
          </Button>
        </Group>
      </Stack>
    </PermissionGate>
  )
}
