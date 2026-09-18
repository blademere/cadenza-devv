import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Group, Stack, Text } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import { useApplication } from '../../applications/queries/applications.queries'
import { useSubmissionAppointment } from '../queries/submission-appointments.queries'
import SubmissionAppointmentScheduler from '../components/SubmissionAppointmentScheduler'

const unwrap = (value) => value?.data ?? value
const normalizeAppointment = (value) => {
  let current = unwrap(value)
  if (current?.appointment && typeof current.appointment === 'object') current = unwrap(current.appointment)
  if (!current || typeof current !== 'object' || !current.id) return null
  return current
}
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function SubmissionAppointmentPage() {
  const { applicationId } = useParams()
  const [changing, setChanging] = useState(false)
  const applicationQuery = useApplication(applicationId)
  const appointmentQuery = useSubmissionAppointment(applicationId)
  const application = unwrap(applicationQuery.data)
  const appointment = normalizeAppointment(appointmentQuery.data)

  if (applicationQuery.isLoading || appointmentQuery.isLoading) return <Stack className="obo-page"><LoadingState label="Loading submission appointment…" /></Stack>
  if (applicationQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application">{applicationQuery.error.message}</Alert></Stack>
  if (appointmentQuery.error && appointmentQuery.error.status !== 404) return <Stack className="obo-page"><Alert color="red" title="Unable to load submission appointment">{appointmentQuery.error.message}</Alert></Stack>
  if (!application) return <Stack className="obo-page"><Alert color="gray" title="Application not found">The requested permit application is not available.</Alert></Stack>

  const scheduled = Boolean(appointment)
  const canSchedule = application.status === 'READY_FOR_SUBMISSION' && !scheduled
  const canChange = application.status === 'SUBMISSION_SCHEDULED' && scheduled
  const slot = appointment?.slot
  const slotStart = slot?.startsAt ?? appointment?.startsAt
  const slotEnd = slot?.endsAt ?? appointment?.endsAt

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Applications / Submission Appointment"
        title={application.referenceNumber ?? 'Submission appointment'}
        description="Schedule the physical hardcopy submission appointment for this application."
        actions={<Button component={Link} to={`/app/applications/${applicationId}`} variant="default">Back to application</Button>}
      />

      <Group className="obo-panel" p="lg" justify="space-between" align="flex-start">
        <Stack gap={4}><Text size="xs" c="dimmed">Application status</Text><StatusChip status={application.status} /></Stack>
        <Stack gap={4} align="flex-end"><Text size="xs" c="dimmed">Permit type</Text><Text size="sm" fw={600}>{application.permitType?.name ?? '—'}</Text></Stack>
      </Group>

      {scheduled && !changing ? (
        <Stack className="obo-panel" p="lg" gap="sm">
          <Text fw={700}>Appointment confirmed</Text>
          <Text size="sm" c="dimmed">Your hardcopy submission appointment has been booked.</Text>
          <Group gap="xl" mt="sm">
            <Stack gap={2}><Text size="xs" c="dimmed">Reference</Text><Text fw={600}>{appointment.referenceNumber ?? appointment.reference ?? '—'}</Text></Stack>
            <Stack gap={2}><Text size="xs" c="dimmed">Status</Text><StatusChip status={appointment.status ?? 'CONFIRMED'} /></Stack>
            <Stack gap={2}><Text size="xs" c="dimmed">Slot</Text><Text fw={600}>{slotStart ? `${formatDate(slotStart)}${slotEnd ? ` – ${formatDate(slotEnd)}` : ''}` : 'See appointment details'}</Text></Stack>
          </Group>
          {canChange ? <Group justify="flex-end" mt="md"><Button onClick={() => setChanging(true)}>Change appointment</Button></Group> : null}
        </Stack>
      ) : canSchedule || changing ? (
        <Stack gap="md">
          {changing ? <Alert color="yellow" title="Changing appointment">Your current appointment will be cancelled only when the new appointment is successfully selected and booked.</Alert> : null}
          <SubmissionAppointmentScheduler applicationId={applicationId} reschedule={changing} />
          {changing ? <Group justify="flex-end"><Button variant="default" onClick={() => setChanging(false)}>Keep current appointment</Button></Group> : null}
        </Stack>
      ) : (
        <Alert color="gray" title="Scheduling is not available">This application is not currently eligible for a submission appointment. The application status is controlled by the permit workflow.</Alert>
      )}
    </Stack>
  )
}
