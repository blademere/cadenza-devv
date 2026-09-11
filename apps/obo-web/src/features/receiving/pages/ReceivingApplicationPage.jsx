import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Alert, Badge, Box, Button, Divider, Group, Select, SimpleGrid, Stack, Text, Textarea } from '@mantine/core'
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useReceivingApplication } from '../queries/receiving.queries'
import { useDecideReceivingApplication, useReceiveApplication } from '../mutations/receiving.mutations'
import ApplicationDocumentChecklist from '../components/ApplicationDocumentChecklist'

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')
const personName = (person) => [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || person?.email || '—'
const humanizeKey = (key) => String(key ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (value) => value.toUpperCase())
const snapshotEntries = (snapshots) => {
  if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) return []
  return Object.entries(snapshots).flatMap(([fieldKey, value]) => (Array.isArray(value) ? value : [value]).filter(Boolean).map((professional, index) => ({ fieldKey, key: `${fieldKey}-${professional.professionalId ?? index}`, professional })))
}

function ProfessionalReferences({ application }) {
  const entries = snapshotEntries(application.professionalSnapshots)
  if (!entries.length) return <Text size="sm" c="dimmed">No submitted professional snapshot is available.</Text>
  return <Stack gap="md">{entries.map(({ fieldKey, key, professional }) => <Box key={key} p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}><Group justify="space-between" align="flex-start"><Box><Text size="xs" c="dimmed">{humanizeKey(fieldKey)}</Text><Text fw={600}>{professional.name ?? '—'}</Text></Box><Badge variant="light">{professional.role ?? 'Professional'}</Badge></Group><SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" mt="sm"><Box><Text size="xs" c="dimmed">Registration</Text><Text size="sm">{professional.registrationNumber ?? '—'}</Text></Box><Box><Text size="xs" c="dimmed">PRC ID</Text><Text size="sm">{professional.prcId ?? '—'}</Text></Box><Box><Text size="xs" c="dimmed">PTR</Text><Text size="sm">{professional.ptrNumber ?? '—'}</Text></Box></SimpleGrid></Box>)}</Stack>
}

function SharedCaseContext({ application }) {
  const caseRecord = application.caseRecord
  const participants = caseRecord?.participants ?? []
  const requirements = caseRecord?.requirements ?? []
  const tasks = caseRecord?.tasks ?? []
  return <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
    <Box className="obo-panel" p="lg"><Text fw={700}>Case & participants</Text><Text size="sm" c="dimmed" mt={3}>{caseRecord?.caseNumber ?? 'No case number'} · {participants.length} participant{participants.length === 1 ? '' : 's'}</Text><Stack mt="md" gap="xs">{participants.map((participant) => <Group key={participant.id} justify="space-between"><Box><Text size="sm" fw={600}>{personName(participant.person)}</Text><Text size="xs" c="dimmed">{participant.roleKey ?? 'Participant'}</Text></Box>{participant.isPrimary ? <Badge size="sm" variant="light">Primary</Badge> : null}</Group>)}</Stack></Box>
    <Box className="obo-panel" p="lg"><Text fw={700}>Requirements</Text><Text size="sm" c="dimmed" mt={3}>{requirements.length} requirement{requirements.length === 1 ? '' : 's'} attached to the case.</Text><Stack mt="md" gap="xs">{requirements.map((item) => <Group key={item.id} justify="space-between"><Text size="sm">{item.requirement?.name ?? item.requirement?.key ?? 'Requirement'}</Text><StatusChip status={item.status} /></Group>)}</Stack></Box>
    <Box className="obo-panel" p="lg"><Text fw={700}>Tasks</Text><Text size="sm" c="dimmed" mt={3}>Shared Tasks feature work for this case.</Text><Stack mt="md" gap="xs">{tasks.length ? tasks.map((task) => <Group key={task.id} justify="space-between" align="flex-start"><Box><Text size="sm" fw={600}>{task.title}</Text><Text size="xs" c="dimmed">{task.metadata?.taskType ?? 'Task'}{task.dueAt ? ` · Due ${formatDate(task.dueAt)}` : ''}</Text></Box><StatusChip status={task.status} /></Group>) : <Text size="sm" c="dimmed">No tasks recorded.</Text>}</Stack></Box>
  </SimpleGrid>
}

export default function ReceivingApplicationPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const query = useReceivingApplication(applicationId)
  const receiveMutation = useReceiveApplication()
  const decideMutation = useDecideReceivingApplication()
  const [decision, setDecision] = useState('ACCEPTED')
  const [reason, setReason] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const application = query.data?.data ?? query.data
  const appointment = application?.submissionAppointment?.appointment
  const appointmentStart = appointment?.slot?.startsAt ? new Date(appointment.slot.startsAt) : null
  const appointmentStartTime = appointmentStart && !Number.isNaN(appointmentStart.getTime()) ? appointmentStart.getTime() : null
  const appointmentStarted = appointmentStartTime !== null && appointmentStartTime <= now
  const receiveEnabled = application?.status === 'SUBMISSION_SCHEDULED' && appointment?.status === 'CONFIRMED' && appointmentStarted

  useEffect(() => {
    if (appointmentStartTime === null || appointmentStarted) return undefined
    const delay = Math.max(0, appointmentStartTime - Date.now())
    const timer = window.setTimeout(() => setNow(Date.now()), delay + 50)
    return () => window.clearTimeout(timer)
  }, [appointmentStartTime, appointmentStarted])

  const receive = async () => { await receiveMutation.mutateAsync({ applicationId }) }
  const decide = async () => { if (decision === 'DECLINED' && !reason.trim()) return; await decideMutation.mutateAsync({ applicationId, decision, reason }); navigate('/app/receiving') }

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading receiving application…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load receiving application">{query.error.message ?? 'The receiving application could not be loaded.'}</Alert><Button component={Link} to="/app/receiving" variant="default">Back to receiving</Button></Stack>
  if (!application) return <Stack className="obo-page"><Alert color="gray" title="Application not found">The requested receiving application is not available.</Alert><Button component={Link} to="/app/receiving" variant="default">Back to receiving</Button></Stack>

  return <Stack className="obo-page">
    <PageHeader eyebrow="Operations / Receiving / Application" title={application.referenceNumber ?? application.id} description="Review the case, hard-copy submission, requirements, tasks, and receiving outcome." actions={<Button component={Link} to="/app/receiving" variant="default" leftSection={<ArrowLeft size={18} aria-hidden />}>Back to receiving</Button>} />
    <Box className="obo-panel" p="lg">
      <Group justify="space-between" align="flex-start">
        <Box><Text size="xs" c="dimmed">Current status</Text><Group mt={5}><StatusChip status={application.status} /><Badge variant="light">{application.permitType?.key ?? 'Plan Permit'}</Badge></Group></Box>
        <Box ta="right"><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box>
      </Group>
      <Divider my="lg" />
      <Stack gap="md">
        <Box><Text size="xs" c="dimmed">Applicant</Text><Text fw={600}>{personName(application.clientPerson)}</Text><Text size="sm" c="dimmed">{application.clientPerson?.email ?? '—'}{application.clientPerson?.phone ? ` · ${application.clientPerson.phone}` : ''}</Text></Box>
        <Box><Text size="xs" c="dimmed">Permit type</Text><Text fw={600}>{application.permitType?.name ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Professionals</Text><Box mt="xs"><ProfessionalReferences application={application} /></Box></Box>
        <Box><Text size="xs" c="dimmed">Submission appointment</Text><Text fw={600}>{appointment?.slot?.startsAt ? `${formatDate(appointment.slot.startsAt)} – ${formatDate(appointment.slot.endsAt)}` : '—'}</Text><Text size="sm" c="dimmed">{appointment?.appointmentType?.name ?? 'OBO hardcopy submission'} · {appointment?.status ?? '—'}</Text>{appointment?.notes && <Text size="sm" mt={4}>{appointment.notes}</Text>}</Box>
        <Box><Text size="xs" c="dimmed">Hard-copy received</Text><Text fw={600}>{formatDate(application.submittedAt)}</Text></Box>
      </Stack>
    </Box>
    <SharedCaseContext application={application} />
    {application.status === 'RECEIVING' ? <Box className="obo-panel" p="lg"><Text fw={700}>Required hard-copy documents</Text><Text size="sm" c="dimmed" mt={3}>Record each applicable physical document before accepting the application for inspection.</Text><Box mt="lg"><ApplicationDocumentChecklist applicationId={applicationId} editable /></Box></Box> : null}
    {application.decisions?.length > 0 && <Box className="obo-panel" p="lg"><Text fw={700}>Receiving history</Text><Stack mt="md" gap="md">{application.decisions.map((item) => <Box key={item.id}><Group justify="space-between"><StatusChip status={item.decision} label={item.decision} /><Text size="xs" c="dimmed">{formatDate(item.decidedAt)}</Text></Group>{item.reason && <Text size="sm" mt={5}>{item.reason}</Text>}</Box>)}</Stack></Box>}
    {application.status === 'SUBMISSION_SCHEDULED' && <PermissionGate permission={permissions.planPermits.receive}><Box className="obo-panel" p="lg"><Text fw={700}>Receive hard-copy submission</Text><Text size="sm" c="dimmed" mt={3}>This action confirms the physical submission was received and moves the application into receiving evaluation.</Text>{!appointment && <Alert color="red" mt="md" title="No submission appointment">A confirmed hard-copy submission appointment is required before receiving.</Alert>}{appointment && appointment.status !== 'CONFIRMED' && <Alert color="red" mt="md" title="Appointment is not confirmed">The submission appointment must be confirmed before receiving.</Alert>}{appointment && appointment.status === 'CONFIRMED' && !appointmentStarted && <Alert color="yellow" mt="md" title="Appointment has not started yet">Receiving will be available at {formatDate(appointment.slot?.startsAt)}.</Alert>}{receiveMutation.error && <Alert color="red" mt="md" title="Unable to receive submission">{receiveMutation.error.message}</Alert>}<Button mt="lg" loading={receiveMutation.isPending} disabled={!receiveEnabled} onClick={receive} leftSection={<CheckCircle size={18} aria-hidden />}>Receive hard copy</Button></Box></PermissionGate>}
    {application.status === 'RECEIVING' && <PermissionGate permission={permissions.planPermits.receive}><Box className="obo-panel" p="lg"><Text fw={700}>Evaluate submission</Text><Text size="sm" c="dimmed" mt={3}>Accepting moves the application to For Inspection. All required hard-copy documents must be marked received first. Declining requires a reason.</Text><Stack mt="lg"><Select label="Decision" value={decision} onChange={(value) => value && setDecision(value)} data={[{ value: 'ACCEPTED', label: 'Accept — move to inspection' }, { value: 'DECLINED', label: 'Decline' }]} allowDeselect={false} /><Textarea label="Reason" description={decision === 'DECLINED' ? 'Required when declining.' : 'Optional evaluation note.'} value={reason} onChange={(event) => setReason(event.currentTarget.value)} minRows={5} />{decideMutation.error && <Alert color="red" title="Unable to save decision">{decideMutation.error.message}</Alert>}<Group justify="flex-end"><Button variant="default" component={Link} to="/app/receiving" disabled={decideMutation.isPending}>Cancel</Button><Button loading={decideMutation.isPending} disabled={decision === 'DECLINED' && !reason.trim()} onClick={decide}>Save decision</Button></Group></Stack></Box></PermissionGate>}
  </Stack>
}
