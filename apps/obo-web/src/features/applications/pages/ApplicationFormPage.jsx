/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Group, MultiSelect, Select, SimpleGrid, Stack, Text, TextInput, Textarea, Checkbox } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import ProfessionalReferenceField from '../components/ProfessionalReferenceField'
import { useVerifiedProfessionals } from '../../professionals/queries/professionals.queries'
import {
  useCreateApplication,
  useApplication,
  usePermitTypeForm,
  usePermitTypes,
  useSubmitApplication,
  useUpdateApplicationDraft,
} from '../queries/applications.queries'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const unwrapped = unwrap(value)
  return Array.isArray(unwrapped) ? unwrapped : unwrapped?.items ?? []
}
const asForm = (value) => unwrap(value) ?? null
const fieldType = (field) => String(field.type ?? field.fieldType ?? 'text').toLowerCase()
const fieldKey = (field) => field.key ?? field.id
const fieldLabel = (field) => field.label ?? field.name ?? field.key ?? 'Field'
const isProfessionalReference = (field) => fieldType(field) === 'reference' && field?.config?.referenceType === 'obo_professional'
const optionItems = (field) => (field.options ?? []).map((option) => ({ value: String(option.value), label: option.label ?? String(option.value) }))

function FormField({ field, value, error, onChange, professionals }) {
  const type = fieldType(field)
  const label = fieldLabel(field)
  const description = field.description ?? undefined
  const required = Boolean(field.required)
  const common = {
    label,
    description,
    required,
    value: value ?? '',
    error,
    onChange: (event) => onChange(event.currentTarget.value),
  }

  if (isProfessionalReference(field)) return <ProfessionalReferenceField field={field} value={value} error={error} professionals={professionals} onChange={onChange} />
  if (type === 'textarea' || type === 'longtext') return <Textarea {...common} minRows={4} />
  if (type === 'select' || type === 'dropdown') return <Select label={label} description={description} required={required} error={error} data={optionItems(field)} value={value == null ? null : String(value)} onChange={onChange} clearable={!required} />
  if (type === 'multiselect') return <MultiSelect label={label} description={description} required={required} error={error} data={optionItems(field)} value={Array.isArray(value) ? value.map(String) : value == null || value === '' ? [] : [String(value)]} onChange={onChange} clearable={!required} />
  if (type === 'checkbox' || type === 'boolean') return <Checkbox label={label} description={description} error={error} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />
  if (type === 'number' || type === 'integer' || type === 'decimal') return <TextInput {...common} type="number" />
  if (type === 'date') return <TextInput {...common} type="date" />
  if (type === 'datetime') return <TextInput {...common} type="datetime-local" />
  if (type === 'email') return <TextInput {...common} type="email" />
  return <TextInput {...common} />
}

const getErrorMessage = (error) => error?.message ?? error?.error?.message ?? 'The application could not be saved.'

const extractFieldErrors = (error) => {
  const source = error?.errors ?? error?.details?.fieldErrors ?? error?.fieldErrors ?? error?.details
  if (Array.isArray(source)) {
    return source.reduce((result, item) => {
      if (!item || typeof item !== 'object') return result
      const key = item.field ?? item.path ?? item.key
      if (!key) return result
      const message = item.message ?? item.error ?? String(item)
      if (!(key in result)) result[key] = String(message)
      return result
    }, {})
  }
  if (!source || typeof source !== 'object') return {}
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map((item) => item?.message ?? item).join(', ') : String(value?.message ?? value),
    ]),
  )
}

export { extractFieldErrors }

export default function ApplicationFormPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(applicationId)
  const applicationQuery = useApplication(applicationId, { enabled: editing })
  const permitTypesQuery = usePermitTypes()
  const application = unwrap(applicationQuery.data)
  const permitTypes = asArray(permitTypesQuery.data)
  const [permitTypeId, setPermitTypeId] = useState('')
  const [formValues, setFormValues] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [initializedApplicationId, setInitializedApplicationId] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const createMutation = useCreateApplication()
  const updateMutation = useUpdateApplicationDraft()
  const submitMutation = useSubmitApplication()

  const effectivePermitTypeId = editing ? String(application?.permitTypeId ?? '') : permitTypeId
  const formVersion = editing ? application?.formVersion?.version : undefined
  const formQuery = usePermitTypeForm(effectivePermitTypeId, formVersion)
  const form = asForm(formQuery.data)
  const fields = useMemo(() => form?.fields ?? [], [form?.fields])
  const sections = useMemo(() => form?.sections ?? [], [form?.sections])
  const hasProfessionalReferenceFields = useMemo(() => fields.some(isProfessionalReference), [fields])
  const professionalsQuery = useVerifiedProfessionals({ enabled: hasProfessionalReferenceFields })
  const professionals = asArray(professionalsQuery.data)
  const permitType = permitTypes.find((item) => String(item.id) === effectivePermitTypeId)
  const hasConfiguredForm = Boolean(permitType?.formId || permitType?.form?.id)
  const sectionFields = useMemo(() => {
    if (!sections.length) return [{ key: 'default', title: 'Application information', description: null, fields }]
    return sections.map((section) => ({
      ...section,
      fields: fields.filter((field) => field.sectionId === section.id || field.sectionKey === section.key),
    }))
  }, [sections, fields])

  useEffect(() => {
    if (!editing || !application || initializedApplicationId === application.id) return
    setPermitTypeId(String(application.permitTypeId ?? ''))
    setFormValues(application.formValues ?? {})
    setFormErrors({})
    setIsDirty(false)
    setSaveMessage('')
    setInitializedApplicationId(application.id)
  }, [editing, application, initializedApplicationId])

  useEffect(() => {
    if (!editing) return
    setFormErrors({})
  }, [formVersion, editing])

  if (editing && applicationQuery.isLoading) return <Stack className="obo-page"><LoadingState label="Loading application…" /></Stack>
  if (editing && applicationQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application">{applicationQuery.error.message}</Alert></Stack>
  if (editing && application && application.status !== 'DRAFT') return <Stack className="obo-page"><Alert color="gray" title="Application is no longer editable">Only draft applications can be updated.</Alert><Button component={Link} to={`/app/applications/${applicationId}`} variant="light">Back to application</Button></Stack>
  if (permitTypesQuery.isLoading || (effectivePermitTypeId && formQuery.isLoading)) return <Stack className="obo-page"><LoadingState label="Loading application form…" /></Stack>
  if (permitTypesQuery.error || formQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load application form">{permitTypesQuery.error?.message ?? formQuery.error?.message}</Alert></Stack>
  if (hasProfessionalReferenceFields && professionalsQuery.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load professionals">{professionalsQuery.error.message}</Alert></Stack>

  const permitTypeOptions = permitTypes.map((item) => ({ value: String(item.id), label: item.name ?? item.key ?? String(item.id) }))

  const setFieldValue = (key, value) => {
    setFormValues((current) => ({ ...current, [key]: value }))
    setFormErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    setIsDirty(true)
    setSaveMessage('')
  }

  const handlePermitTypeChange = (value) => {
    if (editing) return
    setPermitTypeId(value ?? '')
    setFormValues({})
    setFormErrors({})
    setIsDirty(true)
    setSaveMessage('')
  }

  const handleSave = async () => {
    if (!effectivePermitTypeId) return
    if (!editing && hasConfiguredForm && !form?.formVersionId) {
      setSaveMessage('')
      setFormErrors({ _form: 'This permit type does not have a published application form. Publish a form version before creating an application.' })
      return
    }
    setFormErrors({})
    setSaveMessage('')
    try {
      const payload = {
        formValues,
        ...(form?.formVersionId ? { formVersionId: form.formVersionId } : {}),
      }
      const result = editing
        ? await updateMutation.mutateAsync({ id: applicationId, ...payload })
        : await createMutation.mutateAsync({ permitTypeId: effectivePermitTypeId, ...payload })

      if (editing) {
        if (result?.formValues && typeof result.formValues === 'object') setFormValues(result.formValues)
      }

      setIsDirty(false)
      setSaveMessage('Draft saved.')
      if (!editing && result?.id) navigate(`/app/applications/${result.id}/edit`)
    } catch (error) {
      setFormErrors(extractFieldErrors(error))
    }
  }

  const handleSubmit = async () => {
    if (!editing || !applicationId || application?.status !== 'DRAFT' || isDirty || saving) return
    setSaveMessage('')
    try {
      await submitMutation.mutateAsync(applicationId)
      navigate(`/app/applications/${applicationId}`)
    } catch {
      // Keep the user on the edit page so the server error can be reviewed and retried.
    }
  }

  const mutationError = createMutation.error ?? updateMutation.error
  const saving = createMutation.isPending || updateMutation.isPending
  const submitError = submitMutation.error

  return <Stack className="obo-page">
    <PageHeader
      eyebrow="Applications / Application"
      title={editing ? 'Edit Application' : 'New Application'}
      description={editing ? 'Update the draft application before submitting it for hardcopy submission.' : 'Create a Permit application using the currently published permit form.'}
      actions={<Button component={Link} to={editing ? `/app/applications/${applicationId}` : '/app/applications'} variant="default">Cancel</Button>}
    />
    {mutationError && !Object.keys(formErrors).length && <Alert color="red" title="Unable to save application">{getErrorMessage(mutationError)}</Alert>}
    {submitError && <Alert color="red" title="Unable to submit application">{getErrorMessage(submitError)}</Alert>}
    {saveMessage && <Alert color="green">{saveMessage}</Alert>}
    {Object.keys(formErrors).length > 0 && <Alert color="red" title="Check the application form">{formErrors._form ?? 'Correct the highlighted fields and save the draft again.'}</Alert>}
    <Box className="obo-panel" p="lg">
      <Stack gap="lg">
        <Select label="Permit type" required data={permitTypeOptions} value={effectivePermitTypeId || null} onChange={handlePermitTypeChange} disabled={editing} searchable placeholder="Select a permit type" />
        {effectivePermitTypeId && !form && hasConfiguredForm && <Alert color="yellow">This permit type has a form configured, but no published form version is available. Publish a form version before creating an application.</Alert>}
        {effectivePermitTypeId && !permitType && editing && <Alert color="yellow">The permit type for this application is not present in the current active permit type list.</Alert>}
        {effectivePermitTypeId && form && <Box><Text fw={700}>{form.name ?? 'Application information'}</Text><Text size="sm" c="dimmed" mt={3}>{form.description ?? 'Complete the required application fields.'}</Text></Box>}
        {!effectivePermitTypeId && <Alert color="gray">Select a permit type to load the published application form.</Alert>}
        {effectivePermitTypeId && !form && !hasConfiguredForm && <Alert color="gray">No application form is configured for this permit type. The application can still be saved if the backend permits a form-less application.</Alert>}
        {form && <Stack gap="xl">{sectionFields.map((section, sectionIndex) => <Box key={section.id ?? section.key ?? sectionIndex}><Text fw={650}>{section.title ?? section.name ?? section.label ?? `Section ${sectionIndex + 1}`}</Text>{section.description && <Text size="sm" c="dimmed" mt={3} mb="md">{section.description}</Text>}<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">{section.fields.map((field, index) => <FormField key={field.id ?? field.key ?? index} field={field} value={formValues[fieldKey(field)]} error={formErrors[fieldKey(field)]} professionals={professionals} onChange={(value) => setFieldValue(fieldKey(field), value)} />)}</SimpleGrid>{!section.fields.length && <Text size="sm" c="dimmed" mt="sm">No fields configured in this section.</Text>}</Box>)}</Stack>}
        <Group justify="flex-end">
          <Button variant="default" component={Link} to={editing ? `/app/applications/${applicationId}` : '/app/applications'}>Cancel</Button>
          <PermissionGate permission={editing ? permissions.applications.update : permissions.applications.create}>
            <Button onClick={handleSave} loading={saving} disabled={!effectivePermitTypeId || (!editing && hasConfiguredForm && !form?.formVersionId)}>Save draft</Button>
          </PermissionGate>
          {editing && <PermissionGate permission={permissions.applications.submit}><Button onClick={handleSubmit} loading={submitMutation.isPending} disabled={saving || isDirty || application?.status !== 'DRAFT'}>Submit for submission</Button></PermissionGate>}
        </Group>
      </Stack>
    </Box>
  </Stack>
}
