import { Stack } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import ProfessionalList from '../components/ProfessionalList'
import { useVerifiedProfessionals } from '../queries/professionals.queries'

export default function ProfessionalsPage() {
  const query = useVerifiedProfessionals()
  const professionals = query.data?.data ?? query.data

  return <Stack className="obo-page">
    <PageHeader eyebrow="Operations / Professionals" title="Professionals" description="View professionals who have completed OBO verification and are eligible for permit workflows." />
    <PermissionGate permission={permissions.professionals.read} fallback={<ProfessionalList professionals={[]} emptyTitle="Access restricted" emptyDescription="Your role does not have permission to view professionals." />}>
      <ProfessionalList professionals={Array.isArray(professionals) ? professionals : []} isLoading={query.isLoading} error={query.error} />
    </PermissionGate>
  </Stack>
}
