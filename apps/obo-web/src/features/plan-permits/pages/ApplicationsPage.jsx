import { Alert, Box, Stack } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PlanPermitApplicationList from '../components/PlanPermitApplicationList'
import { usePlanPermitApplications } from '../queries/plan-permits.queries'

export default function ApplicationsPage() {
  const query = usePlanPermitApplications()
  return <Stack className="obo-page"><PageHeader eyebrow="Plan Permits" title="Applications" description="Review plan permit applications and their current workflow status." />{query.error && <Alert color="red" variant="light" title="Unable to load applications">{query.error.message ?? 'The application list could not be loaded.'}</Alert>}{query.isLoading ? <Box className="obo-panel obo-page-loading"><LoadingState label="Loading applications…" /></Box> : <PlanPermitApplicationList data={query.data} />}</Stack>
}
