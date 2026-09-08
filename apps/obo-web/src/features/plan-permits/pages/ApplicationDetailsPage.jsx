import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Box, Button, Divider, Group, Stack, Text } from '@mantine/core'
import { CalendarCheck, PencilSimple, Plus } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { usePlanPermitApplication, useSubmitPlanPermitApplication } from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'
const professionalName = (professional) => {
  if (!professional) return '—'
  const name = [professional.person?.firstName, professional.person?.middleName, professional.person?.lastName, professional.person?.suffix].filter(Boolean).join(' ')
  return name || professional.registrationNumber || professional.email || professional.id || '—'
}

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const query = usePlanPermitApplication(applicationId)
  const submitMutation = useSubmitPlanPermitApplication()
  const application = unwrap(query.data)
  const decisions = application?.decisions ?? []
  const submissionAppointment = application?.submissionAppointment
  const canSchedule = application?.status === 'READY_FOR_SUBMISSION' && !submissionAppointment
  const canChangeAppointment = application?.status === 'SUBMISSION_SCHEDULED' && Boolean(submissionAppointment)
  const isDraft = application?.status === 'DRAFT'
  const isDeclined = application?.status === 'DECLINED'
  const isForInspection = application?.status === 'FOR_INSPECTION'
  const latestDecision = decisions[0]

  const handleSubmit = async () => {
    await submitMutation.mutateAsync(applicationId)
    navigate(`/app/applications/${applicationId}`)
  }

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading application…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application">{query.error.message ?? 'The application could not be loaded.'}</Alert><Button component={Link} to="/app/applications" variant="light">Back to applications</Button></Stack>
  if (!application) return <Stack className="obo-page"><Alert color="gray" title="Application not found">The requested permit application is not available.</Alert><Button component={Link} to="/app/applications" variant="light">Back to applications</Button></Stack>

  return <Stack className="obo-page">
    <PageHeader
      eyebrow="Plan Permits / Application"
      title={application.referenceNumber ?? 'Application'}
      description={isForInspection ? 'Hard-copy receiving is complete. This application is now in the inspection phase.' : isDeclined ? 'This application was declined and cannot continue through the current workflow.' : application.permitType?.name ?? 'Plan permit application'}
      actions={<Group>
        <Button component={Link} to="/app/applications" variant="default">Back</Button>
        {isDeclined && <PermissionGate permission={permissions.planPermits.create}><Button component={Link} to="/app/applications/new" leftSection={<Plus size={18} aria-hidden />}>Start New Application</Button></PermissionGate>}
        <PermissionGate permission={permissions.planPermits.update}>{isDraft && <Button component={Link} to={`/app/applications/${applicationId}/edit`} variant="default" leftSection={<PencilSimple size={18} aria-hidden />}>Edit</Button>}</PermissionGate>
        <PermissionGate permission={permissions.planPermits.submit}>{isDraft && <Button onClick={handleSubmit} loading={submitMutation.isPending}>Submit for submission</Button>}</PermissionGate>
        <PermissionGate permission={permissions.planPermits.scheduleSubmission}>
          {canSchedule && <Button component={Link} to={`/app/applications/${applicationId}/submission-appointment`} leftSection={<CalendarCheck size={18} aria-hidden />}>Schedule submission</Button>}
          {canChangeAppointment && <Button component={Link} to={`/app/applications/${applicationId}/submission-appointment`} variant="default" leftSection={<CalendarCheck size={18} aria-hidden />}>Change appointment</Button>}
        </PermissionGate>
      </Group>}
    />
    {submitMutation.error && <Alert color="red" title="Unable to submit application">{submitMutation.error.message ?? 'The application could not be submitted.'}</Alert>}
    {isForInspection && <Alert color="blue" title="Application ready for inspection">The hard-copy submission was accepted. The receiving phase is complete and no further appointment or receiving action is available.</Alert>}
    {isDeclined && <Alert color="red" title="Application declined"><Stack gap={4}><Text size="sm">This application cannot continue through the current workflow. A new application is required.</Text>{latestDecision?.reason && <Text size="sm"><strong>Reason:</strong> {latestDecision.reason}</Text>}{latestDecision?.decidedAt && <Text size="xs" c="dimmed">Decision recorded {formatDate(latestDecision.decidedAt)}</Text>}</Stack></Alert>}
    <Box className="obo-panel" p="lg">
      <Group justify="space-between" align="flex-start"><Box><Text size="xs" c="dimmed">Current status</Text><Group mt={5}><StatusChip status={application.status} /><Badge variant="light">{application.permitType?.key ?? 'Plan Permit'}</Badge></Group></Box><Box ta="right"><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box></Group>
      <Divider my="lg" />
      <Group grow align="flex-start"><Box><Text size="xs" c="dimmed">Permit type</Text><Text size="sm" fw={600}>{application.permitType?.name ?? '—'}</Text></Box><Box><Text size="xs" c="dimmed">Professional</Text><Text size="sm" fw={600}>{professionalName(application.professional)}</Text>{application.professional?.registrationNumber && <Text size="xs" c="dimmed" mt={3}>Reg. no. {application.professional.registrationNumber}</Text>}</Box><Box><Text size="xs" c="dimmed">Submission appointment</Text><Text size="sm" fw={600}>{submissionAppointment ? 'Scheduled' : 'Not scheduled'}</Text></Box></Group>
    </Box>
    {(isForInspection || isDeclined) && latestDecision && <Box className="obo-panel" p="lg"><Text fw={700}>Receiving outcome</Text><Group mt="md" justify="space-between"><Group gap="sm"><StatusChip status={latestDecision.decision ?? latestDecision.status} label={latestDecision.decision ?? latestDecision.status} /><Text size="sm" fw={600}>{latestDecision.reason ?? (isForInspection ? 'Accepted for inspection' : 'Application declined')}</Text></Group><Text size="xs" c="dimmed">{formatDate(latestDecision.decidedAt)}</Text></Group></Box>}
    {isDeclined && <Box className="obo-panel" p="lg"><Text fw={700}>Start a new application</Text><Text size="sm" c="dimmed" mt={3}>The declined application cannot be edited, resubmitted, or scheduled. Start a new application to begin again.</Text><PermissionGate permission={permissions.planPermits.create}><Button mt="md" component={Link} to="/app/applications/new">Start New Application</Button></PermissionGate></Box>}
    <Box className="obo-panel" p="lg"><Text fw={700}>Application history</Text><Text size="sm" c="dimmed" mt={3}>Recorded receiving decisions and workflow outcomes.</Text><Stack mt="lg" gap="md">{decisions.length ? decisions.map((decision, index) => <Box key={decision.id ?? index}><Group justify="space-between"><Group gap="sm"><StatusChip status={decision.decision ?? decision.status} label={decision.decision ?? decision.status} /><Text size="sm" fw={600}>{decision.reason ?? 'Decision recorded'}</Text></Group><Text size="xs" c="dimmed">{formatDate(decision.decidedAt)}</Text></Group>{index < decisions.length - 1 && <Divider mt="md" />}</Box>) : <Text size="sm" c="dimmed">No decisions have been recorded.</Text>}</Stack></Box>
  </Stack>
}
