/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import RequireAnyPermission from '../../authorization/components/RequireAnyPermission'
import { permissions } from '../../../config/permissions'
import FormBuilder, { createField, normalizeDefinition } from '../components/FormBuilder'
import { useCreatePermitTypeForm, useCreatePermitTypeFormVersion, usePermitTypeForm, usePermitTypeFormVersion, usePermitTypes, usePublishPermitTypeFormVersion, useUpdatePermitTypeFormVersion } from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value
const isProfessionalReference = (field) => field?.type === 'reference' && field?.config?.referenceType === 'obo_professional'

export const toPayload = (definition) => ({
  sections: (definition.sections ?? []).map((section, index) => ({ key: section.key, title: section.title, description: section.description ?? null, sortOrder: index })),
  fields: (definition.fields ?? []).map((field, index) => ({
    key: field.key, label: field.label, description: field.description ?? null, type: field.type, sortOrder: index, required: Boolean(field.required), sectionKey: field.sectionKey ?? null,
    ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
    ...(field.validation != null ? { validation: field.validation } : {}),
    ...(field.visibility !== undefined ? { visibility: field.visibility } : {}),
    ...(field.config != null ? { config: field.config } : {}),
    options: (field.options ?? []).map((option, optionIndex) => ({ value: option.value, label: option.label, sortOrder: optionIndex, ...(option.metadata !== undefined ? { metadata: option.metadata } : {}) })),
  })),
})

export const createInitialFormDefinition = () => ({
  sections: [],
  fields: [createField(0)],
})

export const resolvePermitTypeId = (params) => params?.permitTypeId ?? params?.id ?? null

export const createVersionPayload = (form, fallbackDefinition) => {
  const normalized = normalizeDefinition(form)
  const definition = normalized.fields.length > 0 ? normalized : fallbackDefinition
  const payload = toPayload(definition)
  return payload.fields.length > 0 ? payload : null
}

export const getProfessionalReferenceErrors = (definition) => (definition?.fields ?? [])
  .filter(isProfessionalReference)
  .filter((field) => !String(field.config?.professionalRole ?? '').trim())
  .map((field) => `${field.label ?? field.key ?? 'Professional field'} requires a professional role.`)

export const hasConfiguredForm = (form) => Boolean(form?.id || form?.formId)
export const hasConfiguredPermitTypeForm = (permitType, form) => hasConfiguredForm(form) || Boolean(permitType?.formId || permitType?.form?.id)

export default function PermitTypeFormBuilderPage() {
  const params = useParams()
  const permitTypeId = resolvePermitTypeId(params)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const version = Number(searchParams.get('version')) || null
  const [definition, setDefinition] = useState(createInitialFormDefinition)
  const [modalOpen, setModalOpen] = useState(false)
  const [operationError, setOperationError] = useState(null)
  const [meta, setMeta] = useState({ key: '', name: '', description: '' })
  const types = usePermitTypes()
  const published = usePermitTypeForm(permitTypeId)
  const draft = usePermitTypeFormVersion(permitTypeId, version)
  const createForm = useCreatePermitTypeForm()
  const createVersion = useCreatePermitTypeFormVersion()
  const updateVersion = useUpdatePermitTypeFormVersion()
  const publishVersion = usePublishPermitTypeFormVersion()
  const permitTypeData = unwrap(types.data)
  const permitType = (Array.isArray(permitTypeData) ? permitTypeData : permitTypeData?.items ?? []).find((item) => String(item.id) === String(permitTypeId))
  const publishedForm = unwrap(published.data)
  const activeForm = version ? unwrap(draft.data) : publishedForm
  const activeVersion = activeForm?.version ?? null
  const isDraft = activeForm?.status === 'DRAFT'
  const hasConfiguredFormForPermitType = hasConfiguredPermitTypeForm(permitType, publishedForm)
  const loading = types.isLoading || (!version && published.isLoading) || (Boolean(version) && draft.isLoading)
  const error = version
    ? errorFromHooks(types, draft, createForm, createVersion, updateVersion, publishVersion)
    : errorFromHooks(types, published, createForm, createVersion, updateVersion, publishVersion)
  const payload = useMemo(() => toPayload(definition), [definition])
  const professionalReferenceErrors = useMemo(() => getProfessionalReferenceErrors(definition), [definition])

  useEffect(() => { if (activeForm) setDefinition(normalizeDefinition(activeForm)) }, [activeForm])

  const missingPermitTypeIdError = !permitTypeId ? new Error('Permit type ID is missing from the route.') : null
  const formError = operationError || error || missingPermitTypeIdError

  const createDraftFrom = (form) => {
    if (!permitTypeId || !hasConfiguredPermitTypeForm(permitType, form)) {
      setOperationError(new Error('This permit type does not have a configured form. Create the form before creating a new version.'))
      return
    }
    const draftPayload = createVersionPayload(form, definition)
    if (!draftPayload?.fields?.length) {
      setOperationError(new Error('A form version must contain at least one field.'))
      return
    }
    setOperationError(null)
    createVersion.mutate({ id: permitTypeId, ...draftPayload }, { onSuccess: (created) => setSearchParams({ version: String(created.version) }) })
  }

  const startNewVersion = () => createDraftFrom(publishedForm)

  const saveDraft = () => {
    if (!permitTypeId || !activeVersion) return
    if (!payload.fields.length) {
      setOperationError(new Error('A form version must contain at least one field.'))
      return
    }
    setOperationError(null)
    updateVersion.mutate({ id: permitTypeId, version: activeVersion, ...payload })
  }

  const publish = () => {
    if (!permitTypeId || !activeVersion) return
    if (professionalReferenceErrors.length) {
      setOperationError(new Error(`Configure every professional-reference field before publishing: ${professionalReferenceErrors.join(' ')}`))
      return
    }
    publishVersion.mutate({ id: permitTypeId, version: activeVersion }, { onSuccess: () => navigate(`/app/permit-types/${permitTypeId}`) })
  }

  const openCreateForm = () => {
    setMeta({
      key: `${permitType?.key ?? 'permit'}-application`,
      name: `${permitType?.name ?? 'Permit'} Application`,
      description: `Application form for ${permitType?.name ?? 'this permit type'}.`,
    })
    setModalOpen(true)
  }

  const submitCreateForm = () => {
    if (!permitTypeId) return
    const initialDefinition = createInitialFormDefinition()
    const initialPayload = toPayload(initialDefinition)

    if (!initialPayload.fields.length) {
      setOperationError(new Error('A form version must contain at least one field.'))
      return
    }

    setOperationError(null)
    createForm.mutate({ id: permitTypeId, key: meta.key, name: meta.name, description: meta.description || null, entityType: 'OboPermitApplication', ...initialPayload }, {
      onSuccess: (created) => {
        const createdForm = unwrap(created)
        const createdVersion = createdForm?.versions?.find((item) => Number(item.version) === 1) ?? createdForm?.versions?.[0]
        setModalOpen(false)
        if (createdVersion?.version) {
          setSearchParams({ version: String(createdVersion.version) })
        } else {
          setOperationError(new Error('The form was created but version 1 could not be opened. Refresh and try again.'))
        }
      },
    })
  }

  return (
    <RequireAnyPermission permissions={[permissions.forms.create, permissions.forms.update]}>
      <Stack className="obo-page">
        <PageHeader eyebrow="Plan Permits / Permit Type / Form" title={permitType?.name ?? 'Form management'} description="Build the permit form, configure professional-reference fields, and publish an immutable version." actions={(
          <Group>
            <Button component={Link} to={`/app/permit-types/${permitTypeId}`} variant="default">Back</Button>
            {hasConfiguredFormForPermitType && !version && publishedForm ? <PermissionGate permission={permissions.forms.update}><Button onClick={startNewVersion} loading={createVersion.isPending}>Create New Version</Button></PermissionGate> : null}
            {isDraft ? <PermissionGate permission={permissions.forms.update}><Button onClick={saveDraft} loading={updateVersion.isPending}>Save Draft</Button></PermissionGate> : null}
            {isDraft ? <PermissionGate permission={permissions.forms.publish}><Button onClick={publish} loading={publishVersion.isPending} disabled={professionalReferenceErrors.length > 0}>Publish</Button></PermissionGate> : null}
          </Group>
        )} />
        {loading ? <LoadingState label="Loading form configuration…" /> : null}
        {formError ? <Alert color="red" title="Form management error">{formError.message ?? 'The requested operation could not be completed.'}</Alert> : null}
        {!loading && !formError && professionalReferenceErrors.length > 0 ? <Alert color="yellow" title="Professional selection needs configuration">{professionalReferenceErrors.join(' ')}</Alert> : null}
        {!loading && !formError && !hasConfiguredFormForPermitType && !version ? <Box className="obo-panel" p="lg"><Stack><Text fw={700}>No form configured</Text><Text size="sm" c="dimmed">Create the initial form. Version 1 starts as a draft and must be published before it is used for applications.</Text><PermissionGate permission={permissions.forms.create}><Button onClick={openCreateForm}>Create Form</Button></PermissionGate></Stack></Box> : null}
        {!loading && !formError && activeForm ? <Stack><Box className="obo-panel" p="lg"><Group justify="space-between"><Box><Text fw={700}>{activeForm.name ?? 'Application form'}</Text><Text size="sm" c="dimmed">Version {activeVersion ?? '—'} · {activeForm.status ?? 'PUBLISHED'}</Text>{activeForm.description ? <Text size="sm" mt="xs">{activeForm.description}</Text> : null}</Box><Text size="sm" c={isDraft ? 'orange' : 'dimmed'}>{isDraft ? 'Draft changes are not used until published.' : 'Published versions are immutable.'}</Text></Group></Box><PermissionGate permission={permissions.forms.update}><FormBuilder definition={definition} onChange={setDefinition} /></PermissionGate></Stack> : null}
      </Stack>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Create application form" centered><Stack><TextInput label="Form key" description="Lowercase letters, numbers, hyphens, or underscores." value={meta.key} onChange={(event) => setMeta((current) => ({ ...current, key: event.currentTarget.value }))} /><TextInput label="Form name" value={meta.name} onChange={(event) => setMeta((current) => ({ ...current, name: event.currentTarget.value }))} /><Textarea label="Description" value={meta.description} onChange={(event) => setMeta((current) => ({ ...current, description: event.currentTarget.value || null }))} autosize minRows={3} /><Group justify="flex-end"><Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button><PermissionGate permission={permissions.forms.create}><Button onClick={submitCreateForm} loading={createForm.isPending}>Create</Button></PermissionGate></Group></Stack></Modal>
    </RequireAnyPermission>
  )
}

function errorFromHooks(...hooks) {
  return hooks.find((hook) => hook?.error)?.error ?? null
}
