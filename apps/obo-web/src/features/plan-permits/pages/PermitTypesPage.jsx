import { Box, Stack } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { ErrorState } from '../../../components/feedback'
import PermitTypeList from '../components/PermitTypeList'
import { usePermitTypes } from '../queries/plan-permits.queries'

export default function PermitTypesPage() {
  const query = usePermitTypes()

  return (
    <Stack className="obo-page">
      <PageHeader eyebrow="Plan Permits" title="Permit Types" description="Review active permit types available to the OBO application workflow." />
      {query.error && (
        <ErrorState
          title="Unable to load permit types"
          description={query.error.message ?? 'The permit types could not be loaded.'}
        />
      )}
      {query.isLoading ? (
        <Box className="obo-panel obo-page-loading">
          <LoadingState label="Loading permit types…" />
        </Box>
      ) : (
        <PermitTypeList data={query.data} />
      )}
    </Stack>
  )
}
