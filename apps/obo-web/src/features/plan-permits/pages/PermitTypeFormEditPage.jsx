import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import PermissionGate from '../../authorization/components/PermissionGate'
import RequirePermission from '../../authorization/components/RequirePermission'
import { permissions } from '../../../config/permissions'
import FormBuilder, { createField, normalizeDefinition } from '../components/FormBuilder'
import {
  useCreatePermitTypeForm,
  useCreatePermitTypeFormVersion,
  usePermitTypeForm,
  usePermitTypeFormVersion,
  usePermitTypes,
  usePublishPermitTypeFormVersion,
  useUpdatePermitTypeFormVersion,
} from '../queries/plan-permits.queries'

const unwrap = (value) => value?.data ?? value

export default function PermitTypeFormEditPage() {
  const { permitTypeId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedVersion = Number(searchParams.get('version')) || null
  const [definition, setDefinition] = useState({ sections: [], fields: [createField(0)] })
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [formMeta, setFormMeta] = useState({ key: '', name: '', description: '' })

  const typesQuery = usePermitTypes()
  const publishedQuery = usePermitTypeForm(permitTypeId)
  const draftQuery = usePermitTypeFormVersion(permitTypeId, requestedVersion)
  const createForm = useCreatePermitTypeForm()
  const createVersion = useCreatePermitTypeFormVersion()
  const updateVersion = useUpdatePermitTypeFormVersion()
  const publishVersion = usePublishPermitTypeFormVersion()

  const types = unwrap(typesQuery.data)
  const permitTypes = Array.isArray(types) ? types : types?.items ?? []
  const permitType = permitTypes.find((item) => String(item.id) === String(permitTypeId))
  const publishedForm = unwrap(publishedQuery.data)
  const draftForm = unwrap(draftQuery.data)
  const activeForm = requestedVersion ? draftForm : publishedForm
  const activeVersion = activeForm?.version ?? null
  const isDraft = activeForm?.status === 'DRAFT' || Boolean(requestedVersion)
  const busy = createForm.isPending || createVersion.isPending || updateVersion.isPending || publishVersion.isPending

  useEffect(() => {
    if (activeForm) setDefinition(normalizeDefinition(activeForm))
  }, [activeForm?.formVersionId])

  const error = typesQuery.error || publishedQuery.error || draftQuery.error || createForm.error || createVersion.error || updateVersion.error || publishVersion.error
  const canEdit = Boolean(activeVersion && isDraft)

  const definitionPayload = useMemo(() => ({
    sections: definition.sections.map((section, index) => ({
      key: section.key,
      title: section.title,
      description: section.description ?? null,
      sortOrder: index,
    })),
    fields: definition.fields.map((field, index) => ({
      key: field.key,
      label: field.label,
      description: field.description ?? null,
      type: field.type,
      sortOrder: index,
      required: Boolean(field.required),
      defaultValue: field.defaultValue,
      validation: field.validation,
      visibility: field.visibility,
      config: field.config,
      sectionKey: field.sectionKey ?? null,
      options: field.options ?? [],
    })),
  }), [definition])

  const startNewVersion = () => {
    if (!publishedForm) return
    createVersion.mutate({ id: permitTypeId, ...normalizeDefinition(publishedForm) }, {
      onSuccess: (version) => setSearchParams({ version: String(version.version) }),
    })
  }

  const saveDraft = () => {
    if (!activeVersion) return
    updateVersion.mutate({ id: permitTypeId, version: activeVersion, ...definitionPayload })
  }

  const publish = () => {
    if (!activeVersion) return
    publishVersion.mutate({ id: permitTypeId, version: activeVersion }, {
      onSuccess: () => navigate(`/app/permit-types/${permitTypeId}`),
    })
  }

  const openCreateForm = () => {
    setFormMeta({
      key: `${permitType?.key ?? 'permit'}-application`,
      name: `${permitType?.name ?? 'Permit'} Application`,
      description: `Application form for ${permitType?.name ?? 'this permit type'}.`,
    })
    setFormModalOpen(true)
  }

  const submitCreateForm = () => {
    createForm.mutate({
      id: permitTypeId,
      key: formMeta.key,
      name: formMeta.name,
      description: formMeta.description || null,
      entityType: 'OboPermitApplication',
      sections: [],
      fields: [createField(0)],
    }, {
      onSuccess: (created) => {
        setFormModalOpen(false)
        const createdForm = unwrap(created)
        const firstVersion = createdForm?.versions?.[0]
        if (firstVersion) {
          createVersion.mutate({
            id: permitTypeId,
            sections: firstVersion.sections ?? [],
            fields: firstVersion.fields ?? [],
          }, {
            onSuccess: (version) => setSearchParams({ version: String(version.version) }),
          })
        } else {
          publishedQuery.refetch()
        }
      },
    })
  }

  const loading = typesQuery.isLoading || publishedQuery.isLoading || (requestedVersion && draftQuery.isLoading)

  return (
    <RequirePermission permission={permissions.forms.update}>
      <Stack className="obo-page">
        <PageHeader
          eyebrow="Plan Permits / Permit Type / Form"
          title={permitType?.name ?? 'Form management'}
          description="Build a draft form, save changes, and publish a new immutable version."
          actions={(
            <Group>
              <Button component={Link} to={`/app/permit-types/${permitTypeId}`} variant="default">Back</Button>
              {publishedForm && !requestedVersion ? (
                <PermissionGate permission={permissions.forms.update}>
                  <Button onClick={startNewVersion} loading={createVersion.isPending}>Create New Version</Button>
                </PermissionGate>
              ) : null}
              {canEdit ? <Button onClick={saveDraft} loading={updateVersion.isPending}>Save Draft</Button> : null}
              {canEdit ? (
                <PermissionGate permission={permissions.forms.publish}>
                  <Button onClick={publish} loading={publishVersion.isPending}>Publish</Button>
                </PermissionGate>
              ) : null}
            </Group>
          )}
        />

        {loading ? <LoadingState label="Loading form configuration…" /> : null}
        {error ? <Alert color="red" title="Form management error">{error.message ?? 'The requested operation could not be completed.'}</Alert> : null}

        {!loading && !error && permitType && !publishedForm ? (
          <Box className="obo-panel" p="lg">
            <Stack>
              <Text fw={700}>No form configured</Text>
              <Text size="sm" c="dimmed">Create the initial application form. The platform creates version 1 as published, then this editor creates a draft version for configuration.</Text>
              <PermissionGate permission={permissions.forms.create}>
                <Button onClick={openCreateForm}>Create Form</Button>
              </PermissionGate>
            </Stack>
          </Box>
        ) : null}

        {!loading && !error && activeForm ? (
          <Stack>
            <Box className="obo-panel" p="lg">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text fw={700}>{activeForm.name ?? 'Application form'}</Text>
                  <Text size="sm" c="dimmed">Version {activeVersion ?? '—'} · {activeForm.status ?? (isDraft ? 'DRAFT' : 'PUBLISHED')}</Text>
                  {activeForm.description ? <Text size="sm" mt="xs">{activeForm.description}</Text> : null}
                </Box>
                {isDraft ? <Text size="sm" c="orange">Draft changes are not used by applicants until published.</Text> : <Text size="sm" c="dimmed">Published versions are immutable.</Text>}
              </Group>
            </Box>
            <FormBuilder definition={definition} onChange={setDefinition} />
          </Stack>
        ) : null}
      </Stack>

      <Modal opened={formModalOpen} onClose={() => setFormModalOpen(false)} title="Create application form" centered>
        <Stack>
          <TextInput label="Form key" description="Lowercase letters, numbers, hyphens, or underscores." value={formMeta.key} onChange={(event) => setFormMeta((current) => ({ ...current, key: event.currentTarget.value }))} />
          <TextInput label="Form name" value={formMeta.name} onChange={(event) => setFormMeta((current) => ({ ...current, name: event.currentTarget.value }))} />
          <Textarea label="Description" value={formMeta.description} onChange={(event) => setFormMeta((current) => ({ ...current, description: event.currentTarget.value }))} autosize minRows={3} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setFormModalOpen(false)}>Cancel</Button>
            <Button onClick={submitCreateForm} loading={createForm.isPending || createVersion.isPending}>Create</Button>
          </Group>
        </Stack>
      </Modal>
    </RequirePermission>
  )
}
