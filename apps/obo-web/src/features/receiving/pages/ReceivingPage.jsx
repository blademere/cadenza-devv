import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Box, Button, Divider, Group, Modal, Select, SimpleGrid, Stack, Text, Textarea } from '@mantine/core'
import { ArrowSquareOut, CheckCircle, ClipboardText, Package } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import EmptyState from '../../../components/common/EmptyState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useDecideReceivingApplication, useReceiveApplication, useReceivingApplications } from '../queries/receiving.queries'

const FILTERS = [
  { value: 'SUBMISSION_SCHEDULED', label: 'Scheduled' },
  { value: 'RECEIVING', label: 'Received / for evaluation' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'FOR_INSPECTION', label: 'For inspection' },
]
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')
const professionalName = (professional) => professional?.name || [professional?.firstName, professional?.lastName].filter(Boolean).join(' ') || professional?.email || '—'
const appointmentStart = (application) => application?.submissionAppointment?.appointment?.slot?.startsAt

function ApplicationSummary({ application }) {
  return <Stack gap="md">
    <Group justify="space-between" align="flex-start"><Stack gap={3}><Text size="xs" c="dimmed">Application</Text><Text fw={700}>{application.referenceNumber ?? application.id}</Text></Stack><StatusChip status={application.status} /></Group>
    <Divider />
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Box><Text size="xs" c="dimmed">Permit type</Text><Text size="sm" fw={600}>{application.permitType?.name ?? '—'}</Text></Box>
      <Box><Text size="xs" c="dimmed">Professional</Text><Text size="sm" fw={600}>{professionalName(application.professional)}</Text></Box>
      <Box><Text size="xs" c="dimmed">Professional status</Text><Text size="sm">{application.professional?.status ?? '—'}</Text></Box>
      <Box><Text size="xs" c="dimmed">Created</Text><Text size="sm">{formatDate(application.createdAt)}</Text></Box>
    </SimpleGrid>
    <Box><Text size="xs" c="dimmed">Submission appointment</Text><Text size="sm" fw={600}>{formatDate(appointmentStart(application))}</Text></Box>
  </Stack>
}

export default function ReceivingPage() {
  const [status, setStatus] = useState('SUBMISSION_SCHEDULED')
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState('ACCEPTED')
  const [reason, setReason] = useState('')
  const applicationsQuery = useReceivingApplications(status)
  const receiveMutation = useReceiveApplication()
  const decideMutation = useDecideReceivingApplication()
  const applications = useMemo(() => {
    const data = applicationsQuery.data?.data ?? applicationsQuery.data
    return Array.isArray(data) ? [...data].sort((a, b) => new Date(appointmentStart(a) || 8640000000000000) - new Date(appointmentStart(b) || 8640000000000000)) : []
  }, [applicationsQuery.data])
  const closeDetails = () => { if (receiveMutation.isPending || decideMutation.isPending) return; setSelected(null); setReason(''); setDecision('ACCEPTED') }
  const handleReceive = async (application) => { await receiveMutation.mutateAsync({ applicationId: application.id }); setSelected(null) }
  const handleDecision = async () => { if (!selected || (decision === 'DECLINED' && !reason.trim())) return; await decideMutation.mutateAsync({ applicationId: selected.id, decision, reason }); closeDetails() }

  return <Stack className="obo-page">
    <PageHeader eyebrow="Operations / Receiving" title="Receiving" description="Receive scheduled hard-copy submissions and evaluate received permit applications." />
    <Group className="obo-panel" p="md" justify="space-between" align="flex-end"><Select label="Queue" value={status} onChange={(value) => value && setStatus(value)} data={FILTERS} allowDeselect={false} w={{ base: '100%', sm: 280 }} /><Text size="sm" c="dimmed">{applications.length} application{applications.length === 1 ? '' : 's'}</Text></Group>
    {applicationsQuery.isLoading ? <LoadingState label="Loading receiving queue…" /> : applicationsQuery.error ? <Alert color="red" title="Unable to load receiving queue">{applicationsQuery.error.message ?? 'The receiving queue could not be loaded.'}</Alert> : applications.length === 0 ? <EmptyState title="No applications in this queue" description="Applications matching the selected receiving status will appear here." /> : <Stack gap="md">
      {applications.map((application) => <Box key={application.id} className="obo-panel" p="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap"><Group align="flex-start" gap="md"><ClipboardText size={24} aria-hidden /><Stack gap={4}><Group gap="sm"><Text fw={700}>{application.referenceNumber ?? application.id}</Text><StatusChip status={application.status} /></Group><Text size="sm" c="dimmed">{application.permitType?.name ?? 'Plan permit application'}</Text><Text size="sm">Professional: <Text component="span" fw={600}>{professionalName(application.professional)}</Text></Text></Stack></Group><Group><Button variant="default" onClick={() => setSelected(application)} leftSection={<Package size={18} aria-hidden />}>View details</Button><Button component={Link} to={`/app/applications/${application.id}`} variant="subtle" rightSection={<ArrowSquareOut size={16} aria-hidden />}>Application</Button></Group></Group>
        <Divider my="md" /><SimpleGrid cols={{ base: 1, sm: 3 }}><Box><Text size="xs" c="dimmed">Appointment</Text><Text size="sm" fw={600}>{formatDate(appointmentStart(application))}</Text></Box><Box><Text size="xs" c="dimmed">Professional verification</Text><Badge variant="light">{application.professional?.status ?? '—'}</Badge></Box><Box><Text size="xs" c="dimmed">Received</Text><Text size="sm" fw={600}>{application.submittedAt ? formatDate(application.submittedAt) : 'Not received'}</Text></Box></SimpleGrid>
        {status === 'SUBMISSION_SCHEDULED' && <PermissionGate permission={permissions.planPermits.receive}><Group justify="flex-end" mt="md"><Button loading={receiveMutation.isPending && receiveMutation.variables?.applicationId === application.id} onClick={() => handleReceive(application)} leftSection={<CheckCircle size={18} aria-hidden />}>Receive hard copy</Button></Group></PermissionGate>}
        {status === 'RECEIVING' && <PermissionGate permission={permissions.planPermits.receive}><Group justify="flex-end" mt="md"><Button onClick={() => { setSelected(application); setDecision('ACCEPTED'); setReason('') }}>Evaluate submission</Button></Group></PermissionGate>}
      </Box>)}
    </Stack>}
    <Modal opened={Boolean(selected)} onClose={closeDetails} title="Application details" size="lg">{selected && <Stack><ApplicationSummary application={selected} />{selected.status === 'SUBMISSION_SCHEDULED' && <PermissionGate permission={permissions.planPermits.receive}><Box><Divider my="lg" /><Button fullWidth loading={receiveMutation.isPending} onClick={() => handleReceive(selected)} leftSection={<CheckCircle size={18} aria-hidden />}>Receive hard copy</Button></Box></PermissionGate>}{selected.status === 'RECEIVING' && <PermissionGate permission={permissions.planPermits.receive}><Box><Divider my="lg" /><Stack><Select label="Decision" value={decision} onChange={(value) => value && setDecision(value)} data={[{ value: 'ACCEPTED', label: 'Accept — move to inspection' }, { value: 'DECLINED', label: 'Decline' }]} allowDeselect={false} /><Textarea label="Reason" description={decision === 'DECLINED' ? 'Required when declining.' : 'Optional evaluation note.'} value={reason} onChange={(event) => setReason(event.currentTarget.value)} minRows={4} />{decideMutation.error && <Alert color="red" title="Unable to save decision">{decideMutation.error.message}</Alert>}<Group justify="flex-end"><Button variant="default" onClick={closeDetails} disabled={decideMutation.isPending}>Cancel</Button><Button loading={decideMutation.isPending} disabled={decision === 'DECLINED' && !reason.trim()} onClick={handleDecision}>Save decision</Button></Group></Stack></Box></PermissionGate>}</Stack>}</Modal>
    {receiveMutation.error && <Alert color="red" title="Unable to receive submission" onClose={() => receiveMutation.reset()} withCloseButton>{receiveMutation.error.message ?? 'The hard-copy submission could not be received.'}</Alert>}
  </Stack>
}
