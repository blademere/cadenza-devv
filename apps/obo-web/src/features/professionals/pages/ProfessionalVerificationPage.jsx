import { Stack } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import ProfessionalVerificationList from '../components/ProfessionalVerificationList'
import { usePendingProfessionals } from '../queries/professionals.queries'
import { useDecideProfessionalVerification } from '../mutations/professionals.mutations'

export default function ProfessionalVerificationPage() {
  const query = usePendingProfessionals()
  const decisionMutation = useDecideProfessionalVerification()
  const professionals = query.data?.data ?? query.data
  const decisionProps = {
    onDecision: decisionMutation.mutateAsync,
    isDecisionPending: decisionMutation.isPending,
    decisionError: decisionMutation.error,
    decisionVariables: decisionMutation.variables,
  }

  return <Stack className="obo-page">
    <PageHeader eyebrow="Operations / Professional verification" title="Professional Verification" description="Review professional registration, PRC ID, and PTR submissions before approving access to OBO permit workflows." />
    <PermissionGate permission={permissions.professionals.review} fallback={<ProfessionalVerificationList professionals={[]} isLoading={false} error={new Error('Your role does not have permission to review professional verification.')} {...decisionProps} />}>
      <ProfessionalVerificationList professionals={Array.isArray(professionals) ? professionals : []} isLoading={query.isLoading} error={query.error} {...decisionProps} />
    </PermissionGate>
  </Stack>
}
