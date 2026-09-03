import { Link, useParams } from 'react-router-dom'
import { Alert, Badge, Box, Button, Divider, Group, Stack, Text } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import { usePlanPermitApplication } from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams()
  const query = usePlanPermitApplication(applicationId)
  const application = unwrap(query.data)
  const decisions = application?.decisions ?? []
  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading application…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application">{query.error.message ?? 'The application could not be loaded.'}</Alert><Button component={Link} to="/app/applications" variant="light">Back to applications</Button></Stack>
  if (!application) return <Stack className="obo-page"><Alert color="gray" title="Application not found">The requested permit application is not available.</Alert><Button component={Link} to="/app/applications" variant="light">Back to applications</Button></Stack>
  return <Stack className="obo-page"><PageHeader eyebrow="Plan Permits / Application" title={application.referenceNumber ?? 'Application'} description={application.permitType?.name ?? 'Plan permit application'} actions={<Button component={Link} to="/app/applications" variant="default">Back</Button>} /><Box className="obo-panel" p="lg"><Group justify="space-between" align="flex-start"><Box><Text size="xs" c="dimmed">Current status</Text><Group mt={5}><StatusChip status={application.status} /><Badge variant="light">{application.permitType?.key ?? 'Plan Permit'}</Badge></Group></Box><Box ta="right"><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box></Group><Divider my="lg" /><Group grow align="flex-start"><Box><Text size="xs" c="dimmed">Permit type</Text><Text size="sm" fw={600}>{application.permitType?.name ?? '—'}</Text></Box><Box><Text size="xs" c="dimmed">Professional</Text><Text size="sm" fw={600}>{application.professional?.name ?? application.professional?.email ?? '—'}</Text></Box><Box><Text size="xs" c="dimmed">Submission appointment</Text><Text size="sm" fw={600}>{application.submissionAppointment?.scheduledAt ? formatDate(application.submissionAppointment.scheduledAt) : 'Not scheduled'}</Text></Box></Group></Box><Box className="obo-panel" p="lg"><Text fw={700}>Application history</Text><Text size="sm" c="dimmed" mt={3}>Recorded receiving decisions and workflow outcomes.</Text><Stack mt="lg" gap="md">{decisions.length ? decisions.map((decision, index) => <Box key={decision.id ?? index}><Group justify="space-between"><Group gap="sm"><StatusChip status={decision.decision ?? decision.status} label={decision.decision ?? decision.status} /><Text size="sm" fw={600}>{decision.reason ?? 'Decision recorded'}</Text></Group><Text size="xs" c="dimmed">{formatDate(decision.decidedAt)}</Text></Group>{index < decisions.length - 1 && <Divider mt="md" />}</Box>) : <Text size="sm" c="dimmed">No decisions have been recorded.</Text>}</Stack></Box></Stack>
}
