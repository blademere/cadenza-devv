import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Alert, Badge, Box, Button, Divider, Group, Select, Stack, Text, Textarea } from '@mantine/core'
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useReceivingApplication } from '../queries/receiving.queries'
import { useDecideReceivingApplication, useReceiveApplication } from '../mutations/receiving.mutations'

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')
const personName = (person) => [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || person?.email || '—'
const professionalName = (professional) => professional?.name || [professional?.firstName, professional?.lastName].filter(Boolean).join(' ') || professional?.email || '—'

export default function ReceivingApplicationPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const query = useReceivingApplication(applicationId)
  const receiveMutation = useReceiveApplication()
  const decideMutation = useDecideReceivingApplication()
  const [decision, setDecision] = useState('ACCEPTED')
  const [reason, setReason] = useState('')
  const application = query.data?.data ?? query.data
  const appointment = application?.submissionAppointment?.appointment
  const receive = async () => { await receiveMutation.mutateAsync({ applicationId }) }
  const decide = async () => { if (decision === 'DECLINED' && !reason.trim()) return; await decideMutation.mutateAsync({ applicationId, decision, reason }); navigate('/app/receiving') }

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading receiving application…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load receiving application">{query.error.message ?? 'The receiving application could not be loaded.'}</Alert><Button component={Link} to="/app/receiving" variant="default">Back to receiving</Button></Stack>
  if (!application) return <Stack className="obo-page"><Alert color="gray" title="Application not found">The requested receiving application is not available.</Alert><Button component={Link} to="/app/receiving" variant="default">Back to receiving</Button></Stack>

  return <Stack className="obo-page">
    <PageHeader eyebrow="Operations / Receiving / Application" title={application.referenceNumber ?? application.id} description="Review the hard-copy submission and record the receiving outcome." actions={<Button component={Link} to="/app/receiving" variant="default" leftSection={<ArrowLeft size={18} aria-hidden />}>Back to receiving</Button>} />
    <Box className="obo-panel" p="lg">
      <Group justify="space-between" align="flex-start">
        <Box><Text size="xs" c="dimmed">Current status</Text><Group mt={5}><StatusChip status={application.status} /><Badge variant="light">{application.permitType?.key ?? 'Plan Permit'}</Badge></Group></Box>
        <Box ta="right"><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box>
      </Group>
      <Divider my="lg" />
      <Stack gap="md">
        <Box><Text size="xs" c="dimmed">Applicant</Text><Text fw={600}>{personName(application.clientPerson)}</Text><Text size="sm" c="dimmed">{application.clientPerson?.email ?? '—'}{application.clientPerson?.phone ? ` · ${application.clientPerson.phone}` : ''}</Text></Box>
        <Box><Text size="xs" c="dimmed">Permit type</Text><Text fw={600}>{application.permitType?.name ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Professional</Text><Text fw={600}>{professionalName(application.professional)}</Text><Text size="sm" c="dimmed">Verification: {application.professional?.status ?? '—'}</Text></Box>
        <Box><Text size="xs" c="dimmed">Submission appointment</Text><Text fw={600}>{appointment?.slot?.startsAt ? `${formatDate(appointment.slot.startsAt)} – ${formatDate(appointment.slot.endsAt)}` : '—'}</Text><Text size="sm" c="dimmed">{appointment?.appointmentType?.name ?? 'OBO hardcopy submission'} · {appointment?.status ?? '—'}</Text>{appointment?.notes && <Text size="sm" mt={4}>{appointment.notes}</Text>}</Box>
        <Box><Text size="xs" c="dimmed">Hard-copy received</Text><Text fw={600}>{formatDate(application.submittedAt)}</Text></Box>
      </Stack>
    </Box>
    {application.decisions?.length > 0 && <Box className="obo-panel" p="lg"><Text fw={700}>Receiving history</Text><Stack mt="md" gap="md">{application.decisions.map((item) => <Box key={item.id}><Group justify="space-between"><StatusChip status={item.decision} label={item.decision} /><Text size="xs" c="dimmed">{formatDate(item.decidedAt)}</Text></Group>{item.reason && <Text size="sm" mt={5}>{item.reason}</Text>}</Box>)}</Stack></Box>}
    {application.status === 'SUBMISSION_SCHEDULED' && <PermissionGate permission={permissions.planPermits.receive}><Box className="obo-panel" p="lg"><Text fw={700}>Receive hard-copy submission</Text><Text size="sm" c="dimmed" mt={3}>This action confirms the physical submission was received and moves the application into receiving evaluation.</Text>{receiveMutation.error && <Alert color="red" mt="md" title="Unable to receive submission">{receiveMutation.error.message}</Alert>}<Button mt="lg" loading={receiveMutation.isPending} onClick={receive} leftSection={<CheckCircle size={18} aria-hidden />}>Receive hard copy</Button></Box></PermissionGate>}
    {application.status === 'RECEIVING' && <PermissionGate permission={permissions.planPermits.receive}><Box className="obo-panel" p="lg"><Text fw={700}>Evaluate submission</Text><Text size="sm" c="dimmed" mt={3}>Accepting moves the application to For Inspection. Declining requires a reason.</Text><Stack mt="lg"><Select label="Decision" value={decision} onChange={(value) => value && setDecision(value)} data={[{ value: 'ACCEPTED', label: 'Accept — move to inspection' }, { value: 'DECLINED', label: 'Decline' }]} allowDeselect={false} /><Textarea label="Reason" description={decision === 'DECLINED' ? 'Required when declining.' : 'Optional evaluation note.'} value={reason} onChange={(event) => setReason(event.currentTarget.value)} minRows={5} />{decideMutation.error && <Alert color="red" title="Unable to save decision">{decideMutation.error.message}</Alert>}<Group justify="flex-end"><Button variant="default" component={Link} to="/app/receiving" disabled={decideMutation.isPending}>Cancel</Button><Button loading={decideMutation.isPending} disabled={decision === 'DECLINED' && !reason.trim()} onClick={decide}>Save decision</Button></Group></Stack></Box></PermissionGate>}
  </Stack>
}
