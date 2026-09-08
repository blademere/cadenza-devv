import { Alert, Box, Button, Group, Stack, Text } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import RequirePermission from '../../authorization/components/RequirePermission'
import { permissions } from '../../../config/permissions'
import { usePermitTypeForm, usePermitTypes } from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value

export default function PermitTypeFormEditPage() {
  const { permitTypeId } = useParams()
  const typesQuery = usePermitTypes()
  const formQuery = usePermitTypeForm(permitTypeId)
  const types = unwrap(typesQuery.data)
  const permitTypes = Array.isArray(types) ? types : types?.items ?? []
  const permitType = permitTypes.find((item) => String(item.id) === String(permitTypeId))
  const form = unwrap(formQuery.data)

  return (
    <RequirePermission permission={permissions.forms.update}>
      <Stack className="obo-page">
        <PageHeader
          eyebrow="Plan Permits / Permit Type / Form"
          title={permitType?.name ?? 'Form management'}
          description="Manage the form configuration for this permit type. Published versions are immutable."
          actions={<Button component={Link} to={`/app/permit-types/${permitTypeId}`} variant="default">Back</Button>}
        />
        {typesQuery.isLoading || formQuery.isLoading ? <LoadingState label="Loading form configuration…" /> : null}
        {typesQuery.error || formQuery.error ? <Alert color="red" title="Unable to load form">{typesQuery.error?.message ?? formQuery.error?.message ?? 'The form could not be loaded.'}</Alert> : null}
        {!typesQuery.isLoading && !formQuery.isLoading && !typesQuery.error && !formQuery.error && !permitType ? <Alert color="gray" title="Permit type not found">The requested permit type is not available.</Alert> : null}
        {!typesQuery.isLoading && !formQuery.isLoading && !typesQuery.error && !formQuery.error && permitType && !form ? (
          <Box className="obo-panel" p="lg">
            <Text fw={700}>No form configured</Text>
            <Text size="sm" c="dimmed" mt="xs">This permit type does not have a form yet.</Text>
            <PermissionGate permission={permissions.forms.create}>
              <Button mt="md" variant="light">Create form</Button>
            </PermissionGate>
          </Box>
        ) : null}
        {form ? (
          <Box className="obo-panel" p="lg">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text fw={700}>{form.name ?? 'Application form'}</Text>
                <Text size="sm" c="dimmed">Version {form.version ?? '—'} · Published</Text>
              </Box>
              <PermissionGate permission={permissions.forms.update}>
                <Button variant="light" disabled>Create new version</Button>
              </PermissionGate>
            </Group>
            <Text size="sm" c="dimmed" mt="lg">Form builder controls will be added in Phase 5. This route establishes the dedicated management surface without editing a published version in place.</Text>
          </Box>
        ) : null}
      </Stack>
    </RequirePermission>
  )
}
