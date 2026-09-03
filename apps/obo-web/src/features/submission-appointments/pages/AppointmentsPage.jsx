import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core'
import { CalendarCheck } from '@phosphor-icons/react'
import LoadingState from '../../../components/common/LoadingState'
import EmptyState from '../../../components/common/EmptyState'
import PageHeader from '../../../components/common/PageHeader'
import SectionCard from '../../../components/common/SectionCard'
import { useMyAppointments } from '../queries/submission-appointments.queries'

const unwrap = (value) => value?.data ?? value
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function AppointmentsPage() {
  const query = useMyAppointments()
  const appointments = unwrap(query.data) ?? []

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading appointments…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load appointments">{query.error.message}</Alert></Stack>

  return (
    <Stack className="obo-page">
      <PageHeader eyebrow="Plan Permits / Appointments" title="Appointments" description="View your scheduled OBO appointments and submission slots." />
      {appointments.length === 0 ? (
        <EmptyState title="No appointments" description="You do not have any appointments yet." />
      ) : (
        <Stack gap="md">
          {appointments.map((appointment) => {
            const applicationId = appointment.metadata?.applicationId
            return (
              <SectionCard key={appointment.id}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group align="flex-start" wrap="nowrap">
                    <CalendarCheck size={24} aria-hidden />
                    <Stack gap={3}>
                      <Text fw={700}>{appointment.appointmentType?.name ?? 'Appointment'}</Text>
                      <Text size="sm" c="dimmed">{appointment.referenceNumber ?? appointment.id}</Text>
                      <Text size="sm">{appointment.slot ? `${formatDate(appointment.slot.startsAt)} – ${formatDate(appointment.slot.endsAt)}` : 'Time unavailable'}</Text>
                    </Stack>
                  </Group>
                  <Stack align="flex-end" gap="xs">
                    <Badge variant="light">{appointment.status}</Badge>
                    {applicationId && <Button component={Link} to={`/app/applications/${applicationId}`} variant="subtle" size="xs">View application</Button>}
                  </Stack>
                </Group>
              </SectionCard>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
