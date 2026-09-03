import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Group, Stack, Text } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import { usePlanPermitApplication } from '../../plan-permits/queries/plan-permits.queries'
import { useSubmissionAppointment } from '../queries/submission-appointments.queries'
import SubmissionAppointmentScheduler from '../components/SubmissionAppointmentScheduler'

const unwrap = (value) => value?.data ?? value
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function SubmissionAppointmentPage() {
  const { applicationId } = useParams()
  const applicationQuery = usePlanPermitApplication(applicationId)
  const appointmentQuery = useSubmissionAppointment(applicationId)
  const application = unwrap(applicationQuery.data)
  const appointment = unwrap(appointmentQuery.data)

  if (applicationQuery.isLoading || appointmentQuery.isLoading) {
    return <Stack className="obo-page"><LoadingState label="Loading submission appointment…" /></Stack>
  }

  if (applicationQuery.error) {
    return <Stack className="obo-page"><Alert color="red" title="Unable to load application">{applicationQuery.error.message}</Alert></Stack>
  }

  if (appointmentQuery.error && appointmentQuery.error.status !== 404) {
    return <Stack className="obo-page"><Alert color="red" title="Unable to load submission appointment">{appointmentQuery.error.message}</Alert></Stack>
  }

  if (!application) {
    return <Stack className="obo-page"><Alert color="gray" title="Application not found">The requested permit application is not available.</Alert></Stack>
  }

  const scheduled = Boolean(appointment)

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Plan Permits / Submission Appointment"
        title={application.referenceNumber ?? 'Submission appointment'}
        description="Schedule the physical hardcopy submission appointment for this application."
        actions={<Button component={Link} to={`/app/applications/${applicationId}`} variant="default">Back to application</Button>}
      />

      <Group className="obo-panel" p="lg" justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed">Application status</Text>
          <StatusChip status={application.status} />
        </Stack>
        <Stack gap={4} align="flex-end">
          <Text size="xs" c="dimmed">Permit type</Text>
          <Text size="sm" fw={600}>{application.permitType?.name ?? '—'}</Text>
        </Stack>
      </Group>

      {scheduled ? (
        <Stack className="obo-panel" p="lg" gap="sm">
          <Text fw={700}>Appointment confirmed</Text>
          <Text size="sm" c="dimmed">Your hardcopy submission appointment has been booked.</Text>
          <Group gap="xl" mt="sm">
            <Stack gap={2}><Text size="xs" c="dimmed">Reference</Text><Text fw={600}>{appointment.referenceNumber ?? '—'}</Text></Stack>
            <Stack gap={2}><Text size="xs" c="dimmed">Status</Text><StatusChip status={appointment.status} /></Stack>
            <Stack gap={2}><Text size="xs" c="dimmed">Slot</Text><Text fw={600}>{appointment.slot?.startsAt ? `${formatDate(appointment.slot.startsAt)} – ${formatDate(appointment.slot.endsAt)}` : 'See appointment details'}</Text></Stack>
          </Group>
        </Stack>
      ) : (
        <SubmissionAppointmentScheduler applicationId={applicationId} />
      )}
    </Stack>
  )
}
