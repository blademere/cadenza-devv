import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Box, Button, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { CalendarCheck, CheckCircle, PencilSimple, Plus } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useApplication, useSubmitApplication } from '../queries/applications.queries'

const unwrap = (value) => value?.data ?? value
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'
const humanizeKey = (key) => String(key ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (value) => value.toUpperCase())
const personName = (person) => [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || person?.email || '—'

const snapshotEntries = (snapshots) => {
  if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) return []
  return Object.entries(snapshots).flatMap(([fieldKey, value]) => {
    const values = Array.isArray(value) ? value : [value]
    return values.filter((professional) => professional && typeof professional === 'object').map((professional, index) => ({
      fieldKey,
      key: `${fieldKey}-${professional.professionalId ?? index}`,
      professional,
    }))
  })
}

function ProfessionalReferences({ application }) {
  const entries = snapshotEntries(application.professionalSnapshots)
  if (!entries.length) return <Text size="sm" c="dimmed">No professional selections have been submitted for this application.</Text>

  return <Stack gap="md">
    <Text size="sm" c="dimmed">Professionals selected through the permit form. Submitted snapshots are retained for historical accuracy.</Text>
    {entries.map(({ fieldKey, key, professional }) => <Box key={key} p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
      <Group justify="space-between" align="flex-start">
        <Box><Text size="xs" c="dimmed">Form field</Text><Text size="sm" fw={600}>{humanizeKey(fieldKey)}</Text><Text size="md" fw={700} mt={3}>{professional.name ?? '—'}</Text></Box>
        <Badge variant="light">{professional.role ?? 'Professional'}</Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" mt="sm">
        <Box><Text size="xs" c="dimmed">Registration</Text><Text size="sm">{professional.registrationNumber ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">PRC ID</Text><Text size="sm">{professional.prcId ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">PTR</Text><Text size="sm">{professional.ptrNumber ?? '—'}</Text></Box>
      </SimpleGrid>
    </Box>)}
  </Stack>
}

function CaseParticipants({ participants }) {
  if (!participants?.length) return <Text size="sm" c="dimmed">No case participants have been recorded.</Text>
  return <Stack gap="sm">{participants.map((participant) => <Box key={participant.id} p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}><Group justify="space-between"><Box><Text fw={600}>{personName(participant.person)}</Text><Text size="sm" c="dimmed">{participant.roleKey ?? 'Participant'}</Text></Box>{participant.isPrimary ? <Badge variant="light">Primary</Badge> : null}</Group></Box>)}</Stack>
}

function RequirementChecklist({ requirements }) {
  if (!requirements?.length) return <Text size="sm" c="dimmed">No case requirements have been attached.</Text>
  return <Stack gap="sm">{requirements.map((item) => {
    const document = item.applicationDocuments?.[0]
    return <Box key={item.id} p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}><Group justify="space-between" align="flex-start"><Box><Text fw={600}>{item.requirement?.name ?? item.requirement?.key ?? 'Requirement'}</Text>{item.requirement?.description && <Text size="sm" c="dimmed">{item.requirement.description}</Text>}</Box><StatusChip status={item.status} /></Group><Group mt="sm" gap="lg"><Text size="xs" c="dimmed">Document: {document?.status ?? 'PENDING'}</Text><Text size="xs" c="dimmed">Submitted: {formatDate(item.submittedAt)}</Text><Text size="xs" c="dimmed">Verified: {formatDate(item.verifiedAt)}</Text></Group></Box>
  })}</Stack>
}

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const query = useApplication(applicationId)
  const submitMutation = useSubmitApplication()
  const application = unwrap(query.data)
  const caseRecord = application?.caseRecord
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
      eyebrow="Applications / Application"
      title={application.referenceNumber ?? 'Application'}
      description={isForInspection ? 'Hard-copy receiving is complete. This application is now in the inspection phase.' : isDeclined ? 'This application was declined and cannot continue through the current workflow.' : application.permitType?.name ?? 'Plan permit application'}
      actions={<Group>
        <Button component={Link} to="/app/applications" variant="default">Back</Button>
        {isDeclined && <PermissionGate permission={permissions.applications.create}><Button component={Link} to="/app/applications/new" leftSection={<Plus size={18} aria-hidden />}>Start New Application</Button></PermissionGate>}
        <PermissionGate permission={permissions.applications.update}>{isDraft && <Button component={Link} to={`/app/applications/${applicationId}/edit`} variant="default" leftSection={<PencilSimple size={18} aria-hidden />}>Edit</Button>}</PermissionGate>
        <PermissionGate permission={permissions.applications.submit}>{isDraft && <Button onClick={handleSubmit} loading={submitMutation.isPending}>Submit for submission</Button>}</PermissionGate>
        <PermissionGate permission={permissions.applications.scheduleSubmission}>
          {canSchedule && <Button component={Link} to={`/app/applications/${applicationId}/submission-appointment`} leftSection={<CalendarCheck size={18} aria-hidden />}>Schedule submission</Button>}
          {canChangeAppointment && <Button component={Link} to={`/app/applications/${applicationId}/submission-appointment`} variant="default" leftSection={<CalendarCheck size={18} aria-hidden />}>Change appointment</Button>}
        </PermissionGate>
      </Group>}
    />
    {submitMutation.error && <Alert color="red" title="Unable to submit application">{submitMutation.error.message ?? 'The application could not be submitted.'}</Alert>}
    {isForInspection && <Alert color="blue" title="Application ready for inspection">The hard-copy submission was accepted. The receiving phase is complete and no further appointment or receiving action is available.</Alert>}
    {isDeclined && <Alert color="red" title="Application declined"><Stack gap={4}><Text size="sm">This application cannot continue through the current workflow. A new application is required.</Text>{latestDecision?.reason && <Text size="sm"><strong>Reason:</strong> {latestDecision.reason}</Text>}{latestDecision?.decidedAt && <Text size="xs" c="dimmed">Decision recorded {formatDate(latestDecision.decidedAt)}</Text>}</Stack></Alert>}

    <Box className="obo-panel" p="lg">
      <Group justify="space-between" align="flex-start"><Box><Text size="xs" c="dimmed">Current status</Text><Group mt={5}><StatusChip status={application.status} /><Badge variant="light">{application.permitType?.key ?? 'Permit'}</Badge></Group></Box><Box ta="right"><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box></Group>
      <Divider my="lg" />
      <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }}>
        <Box><Text size="xs" c="dimmed">Permit type</Text><Text size="sm" fw={600}>{application.permitType?.name ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Form version</Text><Text size="sm" fw={600}>{application.formVersion?.version ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Case</Text><Text size="sm" fw={600}>{caseRecord?.caseNumber ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Submission appointment</Text><Text size="sm" fw={600}>{submissionAppointment ? 'Scheduled' : 'Not scheduled'}</Text></Box>
      </SimpleGrid>
    </Box>

    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      <Box className="obo-panel" p="lg"><Text fw={700}>Case participants</Text><Text size="sm" c="dimmed" mt={3}>Applicant and professional associations are backed by the shared CaseParticipant model.</Text><Box mt="lg"><CaseParticipants participants={caseRecord?.participants} /></Box></Box>
      <Box className="obo-panel" p="lg"><Text fw={700}>Requirements & documents</Text><Text size="sm" c="dimmed" mt={3}>Permit requirements come from the shared Requirements feature; received documents fulfill those case requirements.</Text><Box mt="lg"><RequirementChecklist requirements={caseRecord?.requirements} /></Box></Box>
    </SimpleGrid>

    <Box className="obo-panel" p="lg"><Text fw={700}>Selected professionals</Text><Box mt="lg"><ProfessionalReferences application={application} /></Box></Box>

    {isForInspection || isDeclined ? <Box className="obo-panel" p="lg"><Text fw={700}>Receiving outcome</Text>{latestDecision ? <Group mt="md" justify="space-between"><Group gap="sm"><StatusChip status={latestDecision.decision ?? latestDecision.status} label={latestDecision.decision ?? latestDecision.status} /><Text size="sm" fw={600}>{latestDecision.reason ?? (isForInspection ? 'Accepted for inspection' : 'Application declined')}</Text></Group><Text size="xs" c="dimmed">{formatDate(latestDecision.decidedAt)}</Text></Group> : <Text size="sm" c="dimmed" mt="sm">No receiving decision has been recorded.</Text>}</Box> : null}

    {isDeclined && <Box className="obo-panel" p="lg"><Text fw={700}>Start a new application</Text><Text size="sm" c="dimmed" mt={3}>The declined application cannot be edited, resubmitted, or scheduled. Start a new application to begin again.</Text><PermissionGate permission={permissions.applications.create}><Button mt="md" component={Link} to="/app/applications/new">Start New Application</Button></PermissionGate></Box>}
    <Box className="obo-panel" p="lg"><Text fw={700}>Application history</Text><Text size="sm" c="dimmed" mt={3}>Recorded receiving decisions and workflow outcomes.</Text><Stack mt="lg" gap="md">{decisions.length ? decisions.map((decision, index) => <Box key={decision.id ?? index}><Group justify="space-between"><Group gap="sm"><StatusChip status={decision.decision ?? decision.status} label={decision.decision ?? decision.status} /><Text size="sm" fw={600}>{decision.reason ?? 'Decision recorded'}</Text></Group><Text size="xs" c="dimmed">{formatDate(decision.decidedAt)}</Text></Group>{index < decisions.length - 1 && <Divider mt="md" />}</Box>) : <Text size="sm" c="dimmed">No decisions have been recorded.</Text>}</Stack></Box>
  </Stack>
}
