import { Box, Stack } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { ErrorState } from '../../../components/feedback'
import PlanPermitApplicationList from '../components/PlanPermitApplicationList'
import { usePlanPermitApplications } from '../queries/plan-permits.queries'

export default function ApplicationsPage() {
  const query = usePlanPermitApplications()

  return (
    <Stack className="obo-page">
      <PageHeader eyebrow="Plan Permits" title="Applications" description="Review plan permit applications and their current workflow status." />
      {query.error && (
        <ErrorState
          title="Unable to load applications"
          description={query.error.message ?? 'The application list could not be loaded.'}
        />
      )}
      {query.isLoading ? (
        <Box className="obo-panel obo-page-loading">
          <LoadingState label="Loading applications…" />
        </Box>
      ) : (
        <PlanPermitApplicationList data={query.data} />
      )}
    </Stack>
  )
}
