import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import RequirePermission from '../../authorization/components/RequirePermission'
import { permissions } from '../../../config/permissions'
import FormBuilder, { createField, normalizeDefinition } from '../components/FormBuilder'
import { useCreatePermitTypeForm, useCreatePermitTypeFormVersion, usePermitTypeForm, usePermitTypeFormVersion, usePermitTypes, usePublishPermitTypeFormVersion, useUpdatePermitTypeFormVersion } from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value

export const toPayload = (definition) => ({
  sections: (definition.sections ?? []).map((section, index) => ({ key: section.key, title: section.title, description: section.description ?? null, sortOrder: index })),
  fields: (definition.fields ?? []).map((field, index) => ({
    key: field.key, label: field.label, description: field.description ?? null, type: field.type, sortOrder: index, required: Boolean(field.required), sectionKey: field.sectionKey ?? null,
    ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
    ...(field.validation !== undefined ? { validation: field.validation } : {}),
    ...(field.visibility !== undefined ? { visibility: field.visibility } : {}),
    ...(field.config !== undefined ? { config: field.config } : {}),
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

export const hasConfiguredForm = (form) => Boolean(form?.id || form?.formId)

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
  const loading = types.isLoading || published.isLoading || (Boolean(version) && draft.isLoading)
  const error = errorFromHooks(types, published, draft, createForm, createVersion, updateVersion, publishVersion)
  const payload = useMemo(() => toPayload(definition), [definition])

  useEffect(() => { if (activeForm) setDefinition(normalizeDefinition(activeForm)) }, [activeForm?.formVersionId])

  const missingPermitTypeIdError = !permitTypeId ? new Error('Permit type ID is missing from the route.') : null
  const formError = operationError || error || missingPermitTypeIdError

  const createDraftFromPayload = (draftPayload) => {
    if (!permitTypeId) return
    if (!draftPayload?.fields?.length) {
      setOperationError(new Error('A form version must contain at least one field.'))
      return
    }
    setOperationError(null)
    createVersion.mutate({ id: permitTypeId, ...draftPayload }, { onSuccess: (created) => setSearchParams({ version: String(created.version) }) })
  }

  const createDraftFrom = (form) => {
    if (!hasConfiguredForm(form)) {
      setOperationError(new Error('This permit type does not have a configured form. Create the form before creating a new version.'))
      return
    }
    const draftPayload = createVersionPayload(form, definition)
    createDraftFromPayload(draftPayload)
  }

  const startNewVersion = () => {
    if (!publishedForm) {
      setOperationError(new Error('This permit type does not have a configured form. Create the form before creating a new version.'))
      return
    }
    createDraftFrom(publishedForm)
  }

  const saveDraft = () => {
    if (!permitTypeId || !activeVersion) return
    if (!payload.fields.length) {
      setOperationError(new Error('A form version must contain at least one field.'))
      return
    }
    setOperationError(null)
    updateVersion.mutate({ id: permitTypeId, version: activeVersion, ...payload })
  }

  const publish = () => { if (permitTypeId && activeVersion) publishVersion.mutate({ id: permitTypeId, version: activeVersion }, { onSuccess: () => navigate(`/app/permit-types/${permitTypeId}`) }) }
  const openCreateForm = () => { setMeta({ key: `${permitType?.key ?? 'permit'}-application`, name: `${permitType?.name ?? 'Permit'} Application`, description: `Application form for ${permitType?.name ?? 'this permit type'}.` }); setModalOpen(true) }
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
      onSuccess: async () => {
        const result = await published.refetch()
        const attachedForm = unwrap(result.data)
        if (!hasConfiguredForm(attachedForm)) {
          setOperationError(new Error('The form was created but is not attached to this permit type. Refresh and try again.'))
          return
        }
        setModalOpen(false)
        createDraftFromPayload(initialPayload)
      },
    })
  }

  return (
    <RequirePermission permission={permissions.forms.update}>
      <Stack className="obo-page">
        <PageHeader eyebrow="Plan Permits / Permit Type / Form" title={permitType?.name ?? 'Form management'} description="Build a draft form, save changes, and publish a new immutable version." actions={(
          <Group>
            <Button component={Link} to={`/app/permit-types/${permitTypeId}`} variant="default">Back</Button>
            {publishedForm && !version ? <PermissionGate permission={permissions.forms.update}><Button onClick={startNewVersion} loading={createVersion.isPending}>Create New Version</Button></PermissionGate> : null}
            {isDraft ? <Button onClick={saveDraft} loading={updateVersion.isPending}>Save Draft</Button> : null}
            {isDraft ? <PermissionGate permission={permissions.forms.publish}><Button onClick={publish} loading={publishVersion.isPending}>Publish</Button></PermissionGate> : null}
          </Group>
        )} />
        {loading ? <LoadingState label="Loading form configuration…" /> : null}
        {formError ? <Alert color="red" title="Form management error">{formError.message ?? 'The requested operation could not be completed.'}</Alert> : null}
        {!loading && !formError && permitType && !publishedForm && !version ? <Box className="obo-panel" p="lg"><Stack><Text fw={700}>No form configured</Text><Text size="sm" c="dimmed">Create the initial form. The existing Forms platform creates version 1 as published; this editor then creates version 2 as a draft.</Text><PermissionGate permission={permissions.forms.create}><Button onClick={openCreateForm}>Create Form</Button></PermissionGate></Stack></Box> : null}
        {!loading && !formError && activeForm ? <Stack><Box className="obo-panel" p="lg"><Group justify="space-between"><Box><Text fw={700}>{activeForm.name ?? 'Application form'}</Text><Text size="sm" c="dimmed">Version {activeVersion ?? '—'} · {activeForm.status ?? 'PUBLISHED'}</Text>{activeForm.description ? <Text size="sm" mt="xs">{activeForm.description}</Text> : null}</Box><Text size="sm" c={isDraft ? 'orange' : 'dimmed'}>{isDraft ? 'Draft changes are not used until published.' : 'Published versions are immutable.'}</Text></Group></Box><FormBuilder definition={definition} onChange={setDefinition} /></Stack> : null}
      </Stack>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Create application form" centered><Stack><TextInput label="Form key" description="Lowercase letters, numbers, hyphens, or underscores." value={meta.key} onChange={(event) => setMeta((current) => ({ ...current, key: event.currentTarget.value }))} /><TextInput label="Form name" value={meta.name} onChange={(event) => setMeta((current) => ({ ...current, name: event.currentTarget.value }))} /><Textarea label="Description" value={meta.description} onChange={(event) => setMeta((current) => ({ ...current, description: event.currentTarget.value }))} autosize minRows={3} /><Group justify="flex-end"><Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submitCreateForm} loading={createForm.isPending || createVersion.isPending}>Create</Button></Group></Stack></Modal>
    </RequirePermission>
  )
}

function errorFromHooks(...hooks) {
  return hooks.find((hook) => hook?.error)?.error ?? null
}
