import { useState } from 'react'
import { Alert, Badge, Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import LoadingState from '../../../components/common/LoadingState'
import { useReceivingDocumentChecklist } from '../queries/receiving.queries'
import { useUpdateDocumentReceipt } from '../mutations/receiving.mutations'

const STATUS_LABELS = {
  PENDING: 'Not received',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
}

export default function ApplicationDocumentChecklist({ applicationId, editable = true }) {
  const query = useReceivingDocumentChecklist(applicationId)
  const mutation = useUpdateDocumentReceipt()
  const [notesByRequirement, setNotesByRequirement] = useState({})
  const items = query.data?.data ?? query.data ?? []

  if (query.isLoading) return <LoadingState label="Loading document checklist…" />
  if (query.error) return <Alert color="red" title="Unable to load document checklist">{query.error.message ?? 'The document checklist could not be loaded.'}</Alert>
  if (!Array.isArray(items) || items.length === 0) return <Alert color="gray" title="No document requirements">No applicable hard-copy document requirements are configured for this application.</Alert>

  const mark = async (item, status) => {
    await mutation.mutateAsync({
      applicationId,
      requirementId: item.requirementId,
      status,
      notes: notesByRequirement[item.requirementId] ?? item.notes ?? '',
    })
  }

  return (
    <Stack gap="sm">
      {items.map((item) => {
        const requirement = item.requirement ?? {}
        const received = item.status === 'RECEIVED'
        const rejected = item.status === 'REJECTED'
        return (
          <Paper key={item.requirementId} withBorder p="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={3}>
                <Group gap="xs">
                  <Text fw={650}>{requirement.name ?? 'Document requirement'}</Text>
                  {requirement.required ? <Badge color="red" variant="light">Required</Badge> : <Badge variant="light">Optional</Badge>}
                </Group>
                {requirement.description ? <Text size="sm" c="dimmed">{requirement.description}</Text> : null}
                {item.document?.originalName ? <Text size="xs" c="dimmed">Digital copy: {item.document.originalName}</Text> : null}
                {item.receivedAt ? <Text size="xs" c="dimmed">Received {new Date(item.receivedAt).toLocaleString()}{item.receivedBy?.email ? ` by ${item.receivedBy.email}` : ''}</Text> : null}
              </Stack>
              <Badge color={received ? 'green' : rejected ? 'red' : 'yellow'} variant="light">{STATUS_LABELS[item.status] ?? item.status}</Badge>
            </Group>
            {editable ? (
              <Stack mt="md" gap="sm">
                <Textarea
                  label="Receipt note"
                  placeholder="Optional note about the physical document"
                  value={notesByRequirement[item.requirementId] ?? item.notes ?? ''}
                  onChange={(event) => setNotesByRequirement((current) => ({ ...current, [item.requirementId]: event.currentTarget.value }))}
                  maxLength={2000}
                  disabled={mutation.isPending}
                />
                <Group justify="flex-end">
                  {!received ? <Button variant="light" color="green" leftSection={<CheckCircle size={16} />} onClick={() => mark(item, 'RECEIVED')} loading={mutation.isPending}>Mark received</Button> : null}
                  {!rejected ? <Button variant="light" color="red" leftSection={<XCircle size={16} />} onClick={() => mark(item, 'REJECTED')} loading={mutation.isPending}>Reject</Button> : null}
                </Group>
              </Stack>
            ) : null}
            {mutation.error && mutation.variables?.requirementId === item.requirementId ? <Alert color="red" mt="sm" title="Unable to update document">{mutation.error.message}</Alert> : null}
          </Paper>
        )
      })}
    </Stack>
  )
}
