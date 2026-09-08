import { useEffect, useState } from 'react'
import { Alert, Badge, Box, Button, Group, Stack, Text, TextInput } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { useMyProfile } from '../queries/profile.queries'
import { useUpdateMyProfile } from '../mutations/profile.mutations'

const unwrap = (value) => value?.data ?? value

export default function ProfilePage() {
  const query = useMyProfile()
  const mutation = useUpdateMyProfile()
  const profile = unwrap(query.data)
  const person = profile?.person
  const user = profile?.user
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', suffix: '', phone: '' })

  useEffect(() => {
    if (!person) return
    setForm({
      firstName: person.firstName ?? '',
      middleName: person.middleName ?? '',
      lastName: person.lastName ?? '',
      suffix: person.suffix ?? '',
      phone: person.phone ?? '',
    })
  }, [person])

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.currentTarget.value }))
  const submit = async (event) => {
    event.preventDefault()
    await mutation.mutateAsync({
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      suffix: form.suffix.trim() || null,
      phone: form.phone.trim() || null,
    })
  }

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading profile…" /></Stack>
  if (query.error) return <Stack className="obo-page"><Alert color="red" title="Unable to load profile">{query.error.message ?? 'Your profile could not be loaded.'}</Alert></Stack>

  return <Stack className="obo-page">
    <PageHeader eyebrow="Account" title="My Profile" description="Manage your shared platform Person profile. Your role and account email are managed separately." />
    {mutation.error && <Alert color="red" title="Profile update failed">{mutation.error.message ?? 'Your profile could not be updated.'}</Alert>}
    {mutation.isSuccess && <Alert color="green" title="Profile updated">Your Person profile has been updated.</Alert>}
    <Box className="obo-panel" p="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={700}>{user?.email ?? 'Authenticated user'}</Text>
            <Text size="sm" c="dimmed">Account email</Text>
          </Box>
          <Badge variant="light" color="indigo">{user?.role?.name ?? 'No role'}</Badge>
        </Group>
        <form onSubmit={submit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput label="First name" required value={form.firstName} onChange={setField('firstName')} />
              <TextInput label="Middle name" value={form.middleName} onChange={setField('middleName')} />
            </Group>
            <Group grow align="flex-start">
              <TextInput label="Last name" required value={form.lastName} onChange={setField('lastName')} />
              <TextInput label="Suffix" value={form.suffix} onChange={setField('suffix')} />
            </Group>
            <TextInput label="Phone" value={form.phone} onChange={setField('phone')} maxLength={50} />
            <Group justify="flex-end">
              <Button type="submit" loading={mutation.isPending} disabled={!form.firstName.trim() || !form.lastName.trim()}>Save profile</Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Box>
  </Stack>
}
