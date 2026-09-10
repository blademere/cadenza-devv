import { useState } from 'react'
import { Alert, Box, Button, Group, Modal, Stack, TextInput, Textarea } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { ErrorState } from '../../../components/feedback'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'
import PermitTypeList from '../components/PermitTypeList'
import { useCreatePermitType, usePermitTypes } from '../queries/plan-permits.queries'

export default function PermitTypesPage() {
  const query = usePermitTypes()
  const navigate = useNavigate()
  const createPermitType = useCreatePermitType()
  const [opened, setOpened] = useState(false)
  const [form, setForm] = useState({ key: '', name: '', description: '' })

  const updateForm = (field) => (event) => {
    const value = event.currentTarget.value
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = () => {
    createPermitType.mutate({ ...form, description: form.description || null }, {
      onSuccess: (created) => {
        setOpened(false)
        setForm({ key: '', name: '', description: '' })
        if (created?.id) navigate(`/app/permit-types/${created.id}`)
      },
    })
  }

  return (
    <Stack className="obo-page">
      <PageHeader
        eyebrow="Plan Permits"
        title="Permit Types"
        description="Review and manage active permit types and their application forms."
        actions={(
          <PermissionGate permission={permissions.permitTypes.create}>
            <Button onClick={() => setOpened(true)}>+ Add Permit Type</Button>
          </PermissionGate>
        )}
      />
      {query.error ? <ErrorState title="Unable to load permit types" description={query.error.message ?? 'The permit types could not be loaded.'} /> : null}
      {createPermitType.error ? <Alert color="red" title="Unable to create permit type">{createPermitType.error.message ?? 'The permit type could not be created.'}</Alert> : null}
      {query.isLoading ? (
        <Box className="obo-panel obo-page-loading"><LoadingState label="Loading permit types…" /></Box>
      ) : (
        <PermitTypeList data={query.data} />
      )}

      <Modal opened={opened} onClose={() => setOpened(false)} title="Add Permit Type" centered>
        <Stack>
          <TextInput label="Name" required value={form.name} onChange={updateForm('name')} />
          <TextInput label="Key" required description="Use lowercase letters, numbers, hyphens, or underscores." value={form.key} onChange={updateForm('key')} />
          <Textarea label="Description" value={form.description} onChange={updateForm('description')} autosize minRows={3} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>Cancel</Button>
            <Button onClick={submit} loading={createPermitType.isPending}>Create</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
