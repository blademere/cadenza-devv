import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Group, Modal, Select, Stack, Text, Textarea } from '@mantine/core'
import { CheckCircle, Package, XCircle } from '@phosphor-icons/react'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import EmptyState from '../../../components/common/EmptyState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useDecideReceivingApplication, useReceiveApplication, useReceivingApplications } from '../queries/receiving.queries'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const data = unwrap(value)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
}
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function ReceivingPage() {
  const [decisionApplication, setDecisionApplication] = useState(null)
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const query = useReceivingApplications()
  const receiveMutation = useReceiveApplication()
  const decideMutation = useDecideReceivingApplication({
    onSuccess: () => {
      setDecisionApplication(null)
      setDecision('')
      setReason('')
    },
  })
  const applications = asArray(query.data)

  const sortedApplications = useMemo(() => [...applications].sort((a, b) => {
    const aTime = new Date(a.submissionAppointment?.appointment?.slot?.startsAt ?? a.submissionAppointment?.slot?.startsAt ?? a.createdAt ?? 0).getTime()
    const bTime = new Date(b.submissionAppointment?.appointment?.slot?.startsAt ?? b.submissionAppointment?.slot?.startsAt ?? b.createdAt ?? 0).getTime()
    return aTime - bTime
  }), [applications])

  const submitDecision = async () => {
    if (!decisionApplication || !decision) return
    await decideMutation.mutateAsync({ applicationId: decisionApplication.id, decision, reason })
  }

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading receiving queue…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load receiving queue">{query.error.message}</Alert></Stack>

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Operations / Receiving"
        title="Receiving queue"
        description="Review scheduled hardcopy submissions and record receiving decisions."
      />

      {!sortedApplications.length ? (
        <EmptyState
          title="No applications awaiting receiving"
          description="Applications with scheduled submission appointments will appear here when they are ready to be received."
        />
      ) : (
        <Stack gap="md">
          {sortedApplications.map((application) => {
            const appointment = application.submissionAppointment?.appointment ?? application.submissionAppointment
            const slot = appointment?.slot ?? application.submissionAppointment?.slot
            const professional = application.professional
            return (
              <Card key={application.id} className="obo-panel" withBorder={false} p="lg">
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs">
                    <Group gap="sm">
                      <Text fw={700}>{application.referenceNumber ?? application.id}</Text>
                      <StatusChip status={application.status ?? 'SUBMISSION_SCHEDULED'} />
                    </Group>
                    <Text size="sm">{application.permitType?.name ?? 'Plan permit'}</Text>
                    <Text size="sm" c="dimmed">Professional: {professional?.name ?? professional?.email ?? '—'}</Text>
                    <Text size="sm" c="dimmed">Appointment: {formatDate(slot?.startsAt)}{slot?.endsAt ? ` – ${new Date(slot.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</Text>
                  </Stack>
                  <Group>
                    <PermissionGate permission={permissions.planPermits.receive}>
                      {application.status === 'SUBMISSION_SCHEDULED' && (
                        <Button
                          leftSection={<Package size={18} aria-hidden />}
                          loading={receiveMutation.isPending && receiveMutation.variables?.applicationId === application.id}
                          onClick={() => receiveMutation.mutate({ applicationId: application.id })}
                        >
                          Receive hardcopy
                        </Button>
                      )}
                    </PermissionGate>
                    {application.status === 'RECEIVING' && (
                      <PermissionGate permission={permissions.planPermits.receive}>
                        <Button variant="light" onClick={() => { setDecisionApplication(application); setDecision(''); setReason('') }}>
                          Evaluate
                        </Button>
                      </PermissionGate>
                    )}
                  </Group>
                </Group>

                {receiveMutation.error && receiveMutation.variables?.applicationId === application.id ? (
                  <Alert mt="md" color="red" title="Unable to receive submission">{receiveMutation.error.message}</Alert>
                ) : null}
              </Card>
            )
          })}
        </Stack>
      )}

      <Modal opened={Boolean(decisionApplication)} onClose={() => !decideMutation.isPending && setDecisionApplication(null)} title="Evaluate submission" centered>
        <Stack>
          <Text size="sm" c="dimmed">
            {decisionApplication?.referenceNumber ?? 'Application'} has been received. Record whether the submission is accepted for inspection or declined.
          </Text>
          <Select
            label="Decision"
            placeholder="Select decision"
            value={decision}
            onChange={(value) => setDecision(value ?? '')}
            data={[
              { value: 'ACCEPTED', label: 'Accept — For Inspection' },
              { value: 'DECLINED', label: 'Decline' },
            ]}
            disabled={decideMutation.isPending}
          />
          <Textarea
            label="Reason"
            description="Required when declining."
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            maxLength={2000}
            disabled={decideMutation.isPending}
          />
          {decideMutation.error ? <Alert color="red" title="Unable to record decision">{decideMutation.error.message}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDecisionApplication(null)} disabled={decideMutation.isPending}>Cancel</Button>
            <Button
              leftSection={decision === 'ACCEPTED' ? <CheckCircle size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}
              onClick={submitDecision}
              loading={decideMutation.isPending}
              disabled={!decision || (decision === 'DECLINED' && !reason.trim())}
            >
              Record decision
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
