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
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [prcId, setPrcId] = useState('')
  const [ptrNumber, setPtrNumber] = useState('')

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading professional verification status…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load verification status">{query.error.message ?? 'The professional profile could not be loaded.'}</Alert></Stack>

  const status = String(application?.verificationStatus ?? application?.status ?? '').toUpperCase()
  const reason = application?.verificationReason ?? application?.declineReason ?? application?.reason
  const canApply = !application || status === 'DECLINED'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!registrationNumber.trim() || !prcId.trim() || !ptrNumber.trim()) return
    await mutation.mutateAsync({
      registrationNumber: registrationNumber.trim(),
      prcId: prcId.trim(),
      ptrNumber: ptrNumber.trim(),
    })
  }

  return <Stack className="obo-page">
    <PageHeader eyebrow="Professionals / Verification" title="Professional Verification" description="Submit your professional registration details for OBO verification." />
    {mutation.error && <Alert color="red" title="Verification application failed">{mutation.error.message ?? 'The application could not be submitted.'}</Alert>}
    {mutation.isSuccess && <Alert color="green" title="Verification application submitted">Your professional verification application is pending review.</Alert>}

    {application && !canApply && <Box className="obo-panel" p="lg"><Stack gap="md"><Group justify="space-between"><Text fw={700}>Current verification status</Text><StatusChip status={status} label={status === 'PENDING' ? 'Pending Verification' : status === 'ACCEPTED' || status === 'VERIFIED' ? 'Verified' : status} /></Group>{reason && <Alert color="red" title="Review reason">{reason}</Alert>}{status === 'PENDING' && <Text size="sm" c="dimmed">Your submitted registration details are awaiting Receiving Officer review.</Text>}{(status === 'ACCEPTED' || status === 'VERIFIED') && <Text size="sm" c="dimmed">Your professional profile is verified and can be associated with eligible Plan Permit applications.</Text>}</Stack></Box>}

    {canApply && <Box className="obo-panel" p="lg"><form onSubmit={handleSubmit}><Stack gap="md"><Text fw={700}>{status === 'DECLINED' ? 'Re-apply for verification' : 'Apply for verification'}</Text>{status === 'DECLINED' && <Alert color="yellow">Your previous verification application was declined. Review the reason above and submit updated details.</Alert>}<TextInput label="Registration Number" required value={registrationNumber} onChange={(event) => setRegistrationNumber(event.currentTarget.value)} maxLength={100} /><TextInput label="PRC ID" required value={prcId} onChange={(event) => setPrcId(event.currentTarget.value)} maxLength={100} /><TextInput label="PTR Number" required value={ptrNumber} onChange={(event) => setPtrNumber(event.currentTarget.value)} maxLength={100} /><Group justify="flex-end"><PermissionGate permission={permissions.professionals.create}><Button type="submit" loading={mutation.isPending} disabled={!registrationNumber.trim() || !prcId.trim() || !ptrNumber.trim()}>Submit for verification</Button></PermissionGate></Group></Stack></form></Box>}
  </Stack>
}
