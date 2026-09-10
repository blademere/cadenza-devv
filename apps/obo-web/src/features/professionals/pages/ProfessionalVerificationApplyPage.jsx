import { useState } from 'react'
import { Alert, Box, Button, Group, Stack, Text, TextInput } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import StatusChip from '../../../components/common/StatusChip'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useMyProfessional } from '../queries/professionals.queries'
import { useApplyProfessionalVerification } from '../mutations/professionals.mutations'

const unwrap = (value) => value?.data ?? value

export default function ProfessionalVerificationApplyPage() {
  const query = useMyProfessional()
  const application = unwrap(query.data)
  const mutation = useApplyProfessionalVerification()
  const [prcId, setPrcId] = useState('')
  const [ptrNumber, setPtrNumber] = useState('')
  const noRecord = query.error?.status === 404

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading professional verification status…" /></Stack>
  if (query.error && !noRecord) return <Stack className="obo-page"><Alert color="red" title="Unable to load verification status">{query.error.message ?? 'The professional verification status could not be loaded.'}</Alert></Stack>

  const status = String(application?.status ?? application?.verificationStatus ?? '').toUpperCase()
  const reason = application?.verificationReason ?? application?.declineReason ?? application?.reason
  const hasRecord = Boolean(application) && !noRecord
  const canApply = !hasRecord

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!prcId.trim() || !ptrNumber.trim()) return
    await mutation.mutateAsync({ prcId: prcId.trim(), ptrNumber: ptrNumber.trim() })
  }

  return <Stack className="obo-page">
    <PageHeader eyebrow="Professionals / Verification" title="Professional Verification" description="Submit your professional credentials for OBO verification." />
    {mutation.error && <Alert color="red" title="Verification application failed">{mutation.error.message ?? 'The application could not be submitted.'}</Alert>}
    {mutation.isSuccess && <Alert color="green" title="Verification application submitted">Your professional verification application is pending review.</Alert>}

    {hasRecord && <Box className="obo-panel" p="lg"><Stack gap="md"><Group justify="space-between"><Text fw={700}>Current verification status</Text><StatusChip status={status} label={status === 'PENDING_VERIFICATION' ? 'Pending Verification' : status === 'VERIFIED' ? 'Verified' : status === 'DECLINED' ? 'Declined' : status} /></Group>{application?.registrationNumber && <TextInput label="Professional Registration Number" value={application.registrationNumber} readOnly />}{reason && <Alert color="red" title="Review reason">{reason}</Alert>}{status === 'PENDING_VERIFICATION' && <Text size="sm" c="dimmed">Your submitted credentials are awaiting Receiving Officer review.</Text>}{status === 'VERIFIED' && <Text size="sm" c="dimmed">Your professional profile is verified and can be associated with eligible Plan Permit applications.</Text>}{status === 'DECLINED' && <Alert color="yellow" title="Verification declined">The current backend does not provide a re-application operation for an existing professional verification record.</Alert>}</Stack></Box>}

    {canApply && <Box className="obo-panel" p="lg"><form onSubmit={handleSubmit}><Stack gap="md"><Text fw={700}>Apply for verification</Text><Text size="sm" c="dimmed">Your professional registration number will be generated automatically when the application is submitted.</Text><TextInput label="PRC ID" required value={prcId} onChange={(event) => setPrcId(event.currentTarget.value)} maxLength={100} /><TextInput label="PTR Number" required value={ptrNumber} onChange={(event) => setPtrNumber(event.currentTarget.value)} maxLength={100} /><Group justify="flex-end"><PermissionGate permission={permissions.professionals.create}><Button type="submit" loading={mutation.isPending} disabled={!prcId.trim() || !ptrNumber.trim()}>Submit for verification</Button></PermissionGate></Group></Stack></form></Box>}
  </Stack>
}
