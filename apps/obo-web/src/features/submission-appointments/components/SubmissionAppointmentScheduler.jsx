import { Alert, Badge, Button, Group, Radio, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { CalendarCheck } from '@phosphor-icons/react'
import LoadingState from '../../../components/common/LoadingState'
import SectionCard from '../../../components/common/SectionCard'
import {
  useAppointmentTypes,
  useAvailableAppointmentSlots,
  useScheduleSubmissionAppointment,
} from '../queries/submission-appointments.queries'

const unwrap = (value) => value?.data ?? value
const HARDCOPY_APPOINTMENT_TYPE = 'obo-hardcopy-submission'

const getDateRange = () => {
  const from = new Date()
  const to = new Date(from)
  to.setDate(to.getDate() + 30)
  return { from: from.toISOString(), to: to.toISOString() }
}

const formatSlot = (value) => new Date(value).toLocaleString([], {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export default function SubmissionAppointmentScheduler({ applicationId, onScheduled }) {
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const typesQuery = useAppointmentTypes()
  const appointmentType = unwrap(typesQuery.data)?.find?.((type) => type.key === HARDCOPY_APPOINTMENT_TYPE)
  const range = getDateRange()
  const slotsQuery = useAvailableAppointmentSlots({
    appointmentTypeId: appointmentType?.id,
    ...range,
  })
  const mutation = useScheduleSubmissionAppointment(applicationId, {
    onSuccess: (data) => {
      setSelectedSlotId('')
      onScheduled?.(unwrap(data))
    },
  })

  if (typesQuery.isLoading) return <LoadingState label="Loading appointment options…" />
  if (typesQuery.error) return <Alert color="red" title="Unable to load appointment options">{typesQuery.error.message}</Alert>
  if (!appointmentType) {
    return <Alert color="red" title="Submission appointment unavailable">The OBO hardcopy submission appointment type is not configured.</Alert>
  }
  if (slotsQuery.isLoading) return <LoadingState label="Loading available submission slots…" />
  if (slotsQuery.error) return <Alert color="red" title="Unable to load available slots">{slotsQuery.error.message}</Alert>

  const slots = unwrap(slotsQuery.data) ?? []
  const availableSlots = slots.filter((slot) => slot.status === 'OPEN' && slot.bookedCount < slot.capacity)

  return (
    <SectionCard title="Schedule hardcopy submission" description="Choose an available appointment slot for the physical document submission.">
      <Stack gap="md">
        {availableSlots.length === 0 ? (
          <Alert color="gray" title="No available slots">There are no open submission slots in the next 30 days.</Alert>
        ) : (
          <Radio.Group value={selectedSlotId} onChange={setSelectedSlotId} name="submission-slot" label="Available slots">
            <Stack mt="sm" gap="xs">
              {availableSlots.map((slot) => (
                <Radio
                  key={slot.id}
                  value={slot.id}
                  label={formatSlot(slot.startsAt)}
                  description={`${slot.capacity - slot.bookedCount} slot${slot.capacity - slot.bookedCount === 1 ? '' : 's'} remaining`}
                />
              ))}
            </Stack>
          </Radio.Group>
        )}

        <Group justify="space-between" align="center">
          <Badge variant="light">{appointmentType.name}</Badge>
          <Button
            leftSection={<CalendarCheck size={18} aria-hidden />}
            disabled={!selectedSlotId || mutation.isPending}
            loading={mutation.isPending}
            onClick={() => mutation.mutate({ appointmentTypeId: appointmentType.id, slotId: selectedSlotId })}
          >
            Book submission appointment
          </Button>
        </Group>
        {mutation.error && <Alert color="red" title="Unable to book appointment">{mutation.error.message}</Alert>}
        <Text size="xs" c="dimmed">Availability is validated again by the server when the appointment is booked.</Text>
      </Stack>
    </SectionCard>
  )
}
