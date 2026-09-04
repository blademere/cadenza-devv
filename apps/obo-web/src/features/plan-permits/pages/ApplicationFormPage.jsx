import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Checkbox, Group, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import { useVerifiedProfessionals } from '../../professionals/queries/professionals.queries'
import {
  useCreatePlanPermitApplication,
  usePlanPermitApplication,
  usePermitTypeForm,
  usePermitTypes,
  useSubmitPlanPermitApplication,
  useUpdatePlanPermitDraft,
} from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const unwrapped = unwrap(value)
  return Array.isArray(unwrapped) ? unwrapped : unwrapped?.items ?? []
}
const asForm = (value) => unwrap(value) ?? null
const fieldType = (field) => String(field.type ?? field.fieldType ?? 'text').toLowerCase()
const fieldKey = (field) => field.key ?? field.id
const fieldLabel = (field) => field.label ?? field.name ?? field.key ?? 'Field'
const optionItems = (field) => (field.options ?? []).map((option) => ({ value: String(option.value), label: option.label ?? String(option.value) }))

function FormField({ field, value, onChange }) {
  const type = fieldType(field)
  const label = fieldLabel(field)
  const description = field.description ?? undefined
  const required = Boolean(field.required)
  const common = { label, description, required, value: value ?? '', onChange: (event) => onChange(event.currentTarget.value) }

  if (type === 'textarea' || type === 'longtext') return <Textarea {...common} minRows={4} />
  if (type === 'select' || type === 'dropdown') return <Select label={label} description={description} required={required} data={optionItems(field)} value={value == null ? null : String(value)} onChange={onChange} clearable={!required} />
  if (type === 'checkbox' || type === 'boolean') return <Checkbox label={label} description={description} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />
  if (type === 'number' || type === 'integer' || type === 'decimal') return <TextInput {...common} type="number" />
  if (type === 'date') return <TextInput {...common} type="date" />
  if (type === 'email') return <TextInput {...common} type="email" />
  return <TextInput {...common} />
}

export default function ApplicationFormPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(applicationId)
  const applicationQuery = usePlanPermitApplication(applicationId, { enabled: editing })
  const permitTypesQuery = usePermitTypes()
  const professionalsQuery = useVerifiedProfessionals()
  const application = unwrap(applicationQuery.data)
  const permitTypes = asArray(permitTypesQuery.data)
  const professionals = asArray(professionalsQuery.data)
  const selectedPermitTypeId = editing ? application?.permitTypeId : undefined
  const permitType = permitTypes.find((item) => String(item.id) === String(selectedPermitTypeId))
  const formQuery = usePermitTypeForm(selectedPermitTypeId)
  const form = asForm(formQuery.data)
  const fields = form?.fields ?? []
  const sections = form?.sections ?? []
  const [permitTypeId, setPermitTypeId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [formValues, setFormValues] = useState({})
  const [initialized, setInitialized] = useState(false)
  const createMutation = useCreatePlanPermitApplication()
  const updateMutation = useUpdatePlanPermitDraft()
  const submitMutation = useSubmitPlanPermitApplication()

  const effectivePermitTypeId = editing ? String(application?.permitTypeId ?? '') : permitTypeId
  const effectiveProfessionalId = editing ? String(application?.professionalId ?? professionalId) : professionalId
  const effectiveFormValues = editing && !initialized ? (application?.formValues ?? {}) : formValues

  if (editing && applicationQuery.isLoading) return <Stack className="obo-page"><LoadingState label="Loading application…" /></Stack>
  if (editing && applicationQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application">{applicationQuery.error.message}</Alert></Stack>
  if (editing && application && application.status !== 'DRAFT') return <Stack className="obo-page"><Alert color="gray" title="Application is no longer editable">Only draft applications can be updated.</Alert><Button component={Link} to={`/app/applications/${applicationId}`} variant="light">Back to application</Button></Stack>
  if (permitTypesQuery.isLoading || professionalsQuery.isLoading || (effectivePermitTypeId && formQuery.isLoading)) return <Stack className="obo-page"><LoadingState label="Loading application form…" /></Stack>
  if (permitTypesQuery.error || professionalsQuery.error || formQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application form">{permitTypesQuery.error?.message ?? professionalsQuery.error?.message ?? formQuery.error?.message}</Alert></Stack>

  const permitTypeOptions = permitTypes.map((item) => ({ value: String(item.id), label: item.name ?? item.key ?? String(item.id) }))
  const professionalOptions = professionals.map((item) => ({
    value: String(item.id),
    label: [item.person?.firstName, item.person?.middleName, item.person?.lastName, item.person?.suffix].filter(Boolean).join(' ') || item.registrationNumber || String(item.id),
  }))
  const sectionFields = useMemo(() => {
    if (!sections.length) return [{ key: 'default', title: 'Application information', description: null, fields }]
    return sections.map((section) => ({
      ...section,
      fields: fields.filter((field) => field.sectionId === section.id || field.sectionKey === section.key),
    }))
  }, [sections, fields])
  const setFieldValue = (key, value) => {
    if (editing && !initialized) setInitialized(true)
    setFormValues((current) => ({ ...current, [key]: value }))
  }
  const values = effectiveFormValues
  const mutationError = createMutation.error ?? updateMutation.error ?? submitMutation.error
  const saving = createMutation.isPending || updateMutation.isPending

  const handleSave = async () => {
    const payload = { professionalId: effectiveProfessionalId, formValues: values }
    if (!effectiveProfessionalId || !effectivePermitTypeId) return
    const result = editing
      ? await updateMutation.mutateAsync({ id: applicationId, ...payload })
      : await createMutation.mutateAsync({ permitTypeId: effectivePermitTypeId, ...payload })
    if (result?.id) navigate(`/app/applications/${result.id}`)
  }

  const handleSubmit = async () => {
    if (!editing || !applicationId) return
    await submitMutation.mutateAsync(applicationId)
    navigate(`/app/applications/${applicationId}`)
  }

  return <Stack className="obo-page">
    <PageHeader
      eyebrow="Plan Permits / Application"
      title={editing ? 'Edit Application' : 'New Application'}
      description={editing ? 'Update the draft application before submitting it for hardcopy submission.' : 'Create a Plan Permit application using the currently published permit form.'}
      actions={<Button component={Link} to={editing ? `/app/applications/${applicationId}` : '/app/applications'} variant="default">Cancel</Button>}
    />
    {mutationError && <Alert color="red" title="Unable to save application">{mutationError.message ?? 'The application could not be saved.'}</Alert>}
    <Box className="obo-panel" p="lg">
      <Stack gap="lg">
        <Select label="Permit type" required data={permitTypeOptions} value={effectivePermitTypeId || null} onChange={setPermitTypeId} disabled={editing} searchable placeholder="Select a permit type" />
        {effectivePermitTypeId && !permitType && editing && <Alert color="yellow">The permit type for this application is not present in the current active permit type list.</Alert>}
        <Select label="Verified professional" required data={professionalOptions} value={effectiveProfessionalId || null} onChange={setProfessionalId} searchable placeholder="Select a verified professional" nothingFoundMessage="No verified professionals are available" />
        {effectivePermitTypeId && form && <Box><Text fw={700}>{form.name ?? 'Application information'}</Text><Text size="sm" c="dimmed" mt={3}>{form.description ?? 'Complete the required application fields.'}</Text></Box>}
        {!effectivePermitTypeId && <Alert color="gray">Select a permit type to load its published application form.</Alert>}
        {effectivePermitTypeId && !form && <Alert color="yellow">No published form is configured for this permit type. The application can still be saved if the backend permits a form-less application.</Alert>}
        {form && <Stack gap="xl">{sectionFields.map((section, sectionIndex) => <Box key={section.id ?? section.key ?? sectionIndex}><Text fw={650}>{section.title ?? section.name ?? section.label ?? `Section ${sectionIndex + 1}`}</Text>{section.description && <Text size="sm" c="dimmed" mt={3} mb="md">{section.description}</Text>}<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">{section.fields.map((field, index) => <FormField key={field.id ?? field.key ?? index} field={field} value={values[fieldKey(field)]} onChange={(value) => setFieldValue(fieldKey(field), value)} />)}</SimpleGrid>{!section.fields.length && <Text size="sm" c="dimmed" mt="sm">No fields configured in this section.</Text>}</Box>)}</Stack>}
        <Group justify="flex-end">
          <Button variant="default" component={Link} to={editing ? `/app/applications/${applicationId}` : '/app/applications'}>Cancel</Button>
          <PermissionGate permission={editing ? permissions.planPermits.update : permissions.planPermits.create}>
            <Button onClick={handleSave} loading={saving} disabled={!effectivePermitTypeId || !effectiveProfessionalId}>Save draft</Button>
          </PermissionGate>
          {editing && <PermissionGate permission={permissions.planPermits.submit}><Button onClick={handleSubmit} loading={submitMutation.isPending} disabled={saving}>Submit for submission</Button></PermissionGate>}
        </Group>
      </Stack>
    </Box>
  </Stack>
}
