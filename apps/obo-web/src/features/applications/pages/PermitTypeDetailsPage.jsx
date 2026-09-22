import { Link, useParams } from 'react-router-dom'
import { Alert, Badge, Box, Button, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { usePermitType, usePermitTypeForm } from '../queries/applications.queries'

const unwrap = (value) => value?.data ?? value
const isProfessionalReference = (field) => field?.type === 'reference' && field?.config?.referenceType === 'obo_professional'
const humanizeRole = (role) => String(role ?? '').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export default function PermitTypeDetailsPage() {
  const { permitTypeId } = useParams()
  const typeQuery = usePermitType(permitTypeId)
  const formQuery = usePermitTypeForm(permitTypeId)
  const permitType = unwrap(typeQuery.data)
  const form = unwrap(formQuery.data)
  const fields = Array.isArray(form?.fields) ? form.fields : []
  const sections = Array.isArray(form?.sections) ? form.sections : []
  const documentRequirements = Array.isArray(form?.documentRequirements) ? form.documentRequirements : []
  const professionalFields = fields.filter(isProfessionalReference)

  if (typeQuery.isLoading || formQuery.isLoading) return <Stack className="obo-page"><LoadingState label="Loading permit type…" /></Stack>
  if (typeQuery.error || formQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load permit type">{typeQuery.error?.message ?? formQuery.error?.message ?? 'The permit type could not be loaded.'}</Alert><Button component={Link} to="/app/permit-types" variant="light">Back to permit types</Button></Stack>
  if (!permitType) return <Stack className="obo-page"><Alert color="gray" title="Permit type not found">The requested permit type is not available.</Alert><Button component={Link} to="/app/permit-types" variant="light">Back to permit types</Button></Stack>

  const formEditorPath = `/app/permit-types/${permitType.id}/form/edit`

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Applications / Permit Type"
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
          {professionalFields.length ? <Box className="obo-subtle-panel" p="md"><Text fw={700}>Professional selection</Text><Text size="sm" c="dimmed" mt={3}>Professionals are selected through these form fields. They are not attached to the application as a separate relationship.</Text><Stack mt="md" gap="sm">{professionalFields.map((field) => <Group key={field.id ?? field.key} justify="space-between" align="flex-start"><Box><Text size="sm" fw={650}>{field.label ?? field.name ?? field.key}</Text><Text size="xs" c="dimmed">Field key: {field.key}</Text></Box><Group gap="xs"><Badge variant="light">{humanizeRole(field.config?.professionalRole) || 'Role not configured'}</Badge><Badge variant="light">{field.config?.multiple ? 'Multiple' : 'Single'}</Badge>{field.required ? <Badge color="red" variant="light">Required</Badge> : null}</Group></Group>)}</Stack></Box> : <Alert color="yellow" variant="light">No professional-reference field is configured. Add a Reference field and configure it for an OBO professional role if this permit type requires professionals.</Alert>}
          <Box><Text fw={650} mb="sm">Sections</Text>{sections.length ? <Stack gap="xs">{sections.map((section, index) => <Box key={section.id ?? section.key ?? index}><Text fw={650}>{section.name ?? section.title ?? section.label ?? `Section ${index + 1}`}</Text>{section.description && <Text size="sm" c="dimmed" mt={3}>{section.description}</Text>}<Divider my="sm" /></Box>)}</Stack> : <Text size="sm" c="dimmed">No sections configured.</Text>}</Box>
          <Box><Text fw={650} mb="sm">Fields</Text>{fields.length ? <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">{fields.map((field, index) => <Box key={field.id ?? field.key ?? index} className="obo-subtle-panel" p="sm"><Group justify="space-between" align="flex-start"><Text size="sm" fw={600}>{field.label ?? field.name ?? field.key ?? 'Field'}</Text>{isProfessionalReference(field) ? <Badge color="blue" variant="light">Professional</Badge> : null}</Group><Text size="xs" c="dimmed">{field.type ?? field.fieldType ?? '—'}{field.required ? ' · Required' : ''}{isProfessionalReference(field) && field.config?.professionalRole ? ` · ${humanizeRole(field.config.professionalRole)}` : ''}</Text></Box>)}</SimpleGrid> : <Text size="sm" c="dimmed">No fields configured.</Text>}</Box>
          <Box><Text fw={650} mb="sm">Document requirements</Text>{documentRequirements.length ? <Stack gap="xs">{documentRequirements.map((document, index) => <Text key={document.id ?? document.key ?? index} size="sm">{document.name ?? document.label ?? document.key ?? 'Document requirement'}</Text>)}</Stack> : <Text size="sm" c="dimmed">No document requirements configured.</Text>}</Box>
        </Stack>}
      </Box>
    </Stack>
  )
}
