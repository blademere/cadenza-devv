import { Link, useParams } from 'react-router-dom'
import { Alert, Box, Button, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { usePermitTypeForm, usePermitTypes } from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value

export default function PermitTypeDetailsPage() {
  const { permitTypeId } = useParams()
  const typesQuery = usePermitTypes()
  const formQuery = usePermitTypeForm(permitTypeId)
  const types = unwrap(typesQuery.data)
  const permitTypes = Array.isArray(types) ? types : types?.items ?? []
  const permitType = permitTypes.find((item) => String(item.id) === String(permitTypeId))
  const form = unwrap(formQuery.data)

  if (typesQuery.isLoading || formQuery.isLoading) return <Stack className="obo-page"><LoadingState label="Loading permit type…" /></Stack>
  if (typesQuery.error || formQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load permit type">{typesQuery.error?.message ?? formQuery.error?.message ?? 'The permit type could not be loaded.'}</Alert><Button component={Link} to="/app/permit-types" variant="light">Back to permit types</Button></Stack>
  if (!permitType) return <Stack className="obo-page"><Alert color="gray" title="Permit type not found">The requested permit type is not available.</Alert><Button component={Link} to="/app/permit-types" variant="light">Back to permit types</Button></Stack>

  const formEditorPath = `/app/permit-types/${permitType.id}/form/edit`

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Plan Permits / Permit Type"
        title={permitType.name ?? permitType.key}
        description={permitType.description ?? 'Permit type configuration.'}
        actions={(
          <Group>
            <Button component={Link} to="/app/permit-types" variant="default">Back</Button>
            <PermissionGate permission={permissions.permitTypes.update}>
              <Button variant="light" disabled>Edit permit type</Button>
            </PermissionGate>
          </Group>
        )}
      />
      <Box className="obo-panel" p="lg">
        <Group justify="space-between">
          <Box><Text size="xs" c="dimmed">Key</Text><Text fw={650}>{permitType.key ?? permitType.code ?? '—'}</Text></Box>
          <Box ta="right"><Text size="xs" c="dimmed">Form version</Text><Text fw={650}>{form?.version ?? '—'}</Text></Box>
        </Group>
      </Box>
      <Box className="obo-panel" p="lg">
        <Group justify="space-between" align="flex-start">
          <Box><Text fw={700}>Application form</Text><Text size="sm" c="dimmed" mt={3}>{form?.description ?? 'Form configuration for this permit type.'}</Text></Box>
          {form ? (
            <PermissionGate permission={permissions.forms.update}>
              <Button component={Link} to={formEditorPath} variant="light">Manage form</Button>
            </PermissionGate>
          ) : (
            <PermissionGate permission={permissions.forms.create}>
              <Button component={Link} to={formEditorPath} variant="light">Create form</Button>
            </PermissionGate>
          )}
        </Group>
        {!form ? <Text size="sm" c="dimmed" mt="lg">No published form is configured for this permit type. Create the initial form and its first field before creating additional versions.</Text> : <Stack mt="lg" gap="lg">
          {(form.sections ?? []).map((section, index) => <Box key={section.id ?? section.key ?? index}><Text fw={650}>{section.name ?? section.title ?? section.label ?? `Section ${index + 1}`}</Text>{section.description && <Text size="sm" c="dimmed" mt={3}>{section.description}</Text>}<Divider my="sm" /></Box>)}
          <Box><Text fw={650} mb="sm">Fields</Text>{(form.fields ?? []).length ? <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">{form.fields.map((field, index) => <Box key={field.id ?? field.key ?? index} className="obo-subtle-panel" p="sm"><Text size="sm" fw={600}>{field.label ?? field.name ?? field.key ?? 'Field'}</Text><Text size="xs" c="dimmed">{field.type ?? field.fieldType ?? '—'}{field.required ? ' · Required' : ''}</Text></Box>)}</SimpleGrid> : <Text size="sm" c="dimmed">No fields configured.</Text>}</Box>
          <Box><Text fw={650} mb="sm">Document requirements</Text>{(form.documentRequirements ?? []).length ? <Stack gap="xs">{form.documentRequirements.map((document, index) => <Text key={document.id ?? document.key ?? index} size="sm">{document.name ?? document.label ?? document.key ?? 'Document requirement'}</Text>)}</Stack> : <Text size="sm" c="dimmed">No document requirements configured.</Text>}</Box>
        </Stack>}
      </Box>
    </Stack>
  )
}
