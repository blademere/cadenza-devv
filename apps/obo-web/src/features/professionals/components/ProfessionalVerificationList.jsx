import { useState } from 'react'
import { Alert, Badge, Box, Button, Divider, Group, Stack, Text, Textarea } from '@mantine/core'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import EmptyState from '../../../components/common/EmptyState'
import LoadingState from '../../../components/common/LoadingState'

const professionalName = (professional) => {
  const person = professional?.person ?? professional
  return [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || professional?.name || 'Professional'
}

export default function ProfessionalVerificationList({ professionals = [], isLoading = false, error = null, onDecision, isDecisionPending = false, decisionError = null, decisionVariables = null }) {
  const [reasons, setReasons] = useState({})

  if (isLoading) return <LoadingState label="Loading verification queue…" />
  if (error) return <Alert color="red" title="Unable to load verification queue">{error.message ?? 'The verification queue could not be loaded.'}</Alert>
  if (professionals.length === 0) return <EmptyState title="Verification queue is clear" description="No professional verification applications are waiting for review." />

  const decide = async (id, decision) => {
    const reason = reasons[id]?.trim() ?? ''
    if (decision === 'DECLINED' && !reason) return
    await onDecision?.({ id, decision, reason })
    setReasons((current) => { const next = { ...current }; delete next[id]; return next })
  }

  return <Stack gap="md">{professionals.map((professional) => {
    const id = professional.id
    const busy = isDecisionPending && decisionVariables?.id === id
    return <Box key={id} className="obo-panel" p="lg"><Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={4}><Text fw={700}>{professionalName(professional)}</Text><Text size="sm" c="dimmed">Registration: {professional.registrationNumber ?? '—'}</Text></Stack><Badge variant="light">{professional.status ?? 'PENDING_VERIFICATION'}</Badge></Group><Divider my="md" /><Group gap="xl" wrap="wrap"><Box><Text size="xs" c="dimmed">PRC ID</Text><Text size="sm" fw={600}>{professional.prcId ?? '—'}</Text></Box><Box><Text size="xs" c="dimmed">PTR</Text><Text size="sm" fw={600}>{professional.ptrNumber ?? '—'}</Text></Box></Group><PermissionGate permission={permissions.professionals.review}><Stack gap="sm" mt="md"><Textarea label="Decline reason" placeholder="Required when declining" value={reasons[id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [id]: event.currentTarget.value }))} minRows={3} />{decisionError && decisionVariables?.id === id && <Alert color="red">{decisionError.message ?? 'Unable to record the verification decision.'}</Alert>}<Group justify="flex-end"><Button variant="default" loading={busy && decisionVariables?.decision === 'DECLINED'} disabled={busy} onClick={() => decide(id, 'DECLINED')} leftSection={<XCircle size={18} aria-hidden />}>Decline</Button><Button loading={busy && decisionVariables?.decision === 'ACCEPTED'} disabled={busy} onClick={() => decide(id, 'ACCEPTED')} leftSection={<CheckCircle size={18} aria-hidden />}>Approve verification</Button></Group></Stack></PermissionGate></Box>
  })}</Stack>
}
