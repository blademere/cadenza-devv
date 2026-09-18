import { Box, Button, Stack } from '@mantine/core'
import { Link } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { ErrorState } from '../../../components/feedback'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import ApplicationList from '../components/ApplicationList'
import { useApplications } from '../queries/applications.queries'

export default function ApplicationsPage() {
  const query = useApplications()

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Applications"
        title="Applications"
        description="Create and manage Permit applications and their current workflow status."
        actions={
          <PermissionGate permission={permissions.applications.create}>
            <Button component={Link} to="/app/applications/new">New application</Button>
          </PermissionGate>
        }
      />
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
        <ApplicationList data={query.data} />
      )}
    </Stack>
  )
}
