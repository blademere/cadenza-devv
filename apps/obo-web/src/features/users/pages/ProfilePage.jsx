/* eslint-disable react-hooks/set-state-in-effect */
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Alert, Badge, Box, Button, Divider, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { useAuth } from '../../auth/components/AuthProvider'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'
import { permissions } from '../../../config/permissions'
import { useMyProfessional } from '../../professionals/queries/professionals.queries'
import { useMyProfile } from '../queries/profile.queries'
import { useCreateMyProfile, useUpdateMyProfile } from '../mutations/profile.mutations'

const unwrap = (value) => value?.data ?? value

function ApplicationStatus({ application, error }) {
  if (error && error.status !== 404) return <Alert color="red" title="Unable to load professional application">{error.message ?? 'The professional verification status could not be loaded.'}</Alert>
  if (!application) return <Box><Text fw={700}>Professional application</Text><Text size="sm" c="dimmed" mt={4}>You have not submitted a professional verification application.</Text><Button component={Link} to="/app/professionals/verification/apply" mt="md" variant="light">Apply for verification</Button></Box>
  const status = String(application.status ?? application.verificationStatus ?? '').toUpperCase()
  const label = status === 'PENDING_VERIFICATION' ? 'Pending Verification' : status === 'VERIFIED' ? 'Verified' : status === 'DECLINED' ? 'Declined' : status || 'Unknown'
  const reason = application.verificationReason ?? application.declineReason ?? application.reason
  return <Box><Group justify="space-between" align="flex-start"><Box><Text fw={700}>Professional application</Text><Text size="sm" c="dimmed" mt={4}>Your professional credentials are reviewed separately from your person profile.</Text></Box><Badge color={status === 'VERIFIED' ? 'green' : status === 'DECLINED' ? 'red' : 'yellow'} variant="light">{label}</Badge></Group>{reason && <Alert color="red" title="Review reason" mt="md">{reason}</Alert>}<Button component={Link} to="/app/professionals/verification/apply" mt="md" variant="subtle">View verification</Button></Box>
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { can } = useAuthorization()
  const query = useMyProfile()
  const createMutation = useCreateMyProfile()
  const updateMutation = useUpdateMyProfile()
  const canReadProfessionals = can(permissions.professionals.read)
  const canCreateProfessionals = can(permissions.professionals.create)
  const canManageUsers = can(permissions.users.manage)
  const professionalEnabled = canReadProfessionals || canCreateProfessionals
  const queryConfig = canManageUsers
    ? { title: 'Account Profile', description: 'Manage your personal information for your OBO workspace.' }
    : professionalEnabled
      ? { title: 'Professional Profile', description: 'Manage your shared person profile and professional verification status.' }
      : { title: 'Client Profile', description: 'Manage the personal information used for your OBO applications.' }
  const professionalQuery = useMyProfessional({ enabled: professionalEnabled })
  const profile = unwrap(query.data)
  const person = profile?.person
  const account = profile?.user ?? user
  const profileMissing = query.error?.status === 404
  const mutation = person ? updateMutation : createMutation
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', suffix: '', phone: '' })

  useEffect(() => {
    if (!person) return
    setForm({ firstName: person.firstName ?? '', middleName: person.middleName ?? '', lastName: person.lastName ?? '', suffix: person.suffix ?? '', phone: person.phone ?? '' })
  }, [person])

  const setField = (field) => (event) => {
    const value = event?.currentTarget?.value ?? ''
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    await mutation.mutateAsync({ firstName: form.firstName.trim(), middleName: form.middleName.trim() || null, lastName: form.lastName.trim(), suffix: form.suffix.trim() || null, phone: form.phone.trim() || null })
  }

  if (query.isLoading) return <Stack className="obo-page"><LoadingState label="Loading profile…" /></Stack>
  if (query.error && !profileMissing) return <Stack className="obo-page"><Alert color="red" title="Unable to load profile">{query.error.message ?? 'Your profile could not be loaded.'}</Alert></Stack>

  return <Stack className="obo-page" gap="lg">
    <PageHeader eyebrow="Account" title={queryConfig.title} description={queryConfig.description} />
    {mutation.error && <Alert color="red" title={person ? 'Profile update failed' : 'Profile creation failed'}>{mutation.error.message ?? 'Your profile could not be saved.'}</Alert>}
    {mutation.isSuccess && <Alert color="green" title={person ? 'Profile updated' : 'Profile created'}>Your shared Person profile has been {person ? 'updated' : 'created'}.</Alert>}
    <Box className="obo-panel" p="lg"><Stack gap="lg"><Group justify="space-between" align="flex-start"><Box><Title order={3}>Personal information</Title><Text size="sm" c="dimmed" mt={4}>Your shared Person profile is independent from application roles.</Text></Box><Badge variant="light" color="indigo">{queryConfig.title.replace(' Profile', '')}</Badge></Group><Divider />{profileMissing && <Alert color="blue" title="Complete your profile">Your shared Person profile has not been created yet. Complete the form to create it.</Alert>}<form onSubmit={submit}><Stack gap="md"><SimpleGrid cols={{ base: 1, sm: 2 }}><TextInput label="First name" required value={form.firstName} onChange={setField('firstName')} /><TextInput label="Middle name" value={form.middleName} onChange={setField('middleName')} /><TextInput label="Last name" required value={form.lastName} onChange={setField('lastName')} /><TextInput label="Suffix" value={form.suffix} onChange={setField('suffix')} /><TextInput label="Phone" value={form.phone} onChange={setField('phone')} maxLength={50} /></SimpleGrid><Group justify="flex-end"><Button type="submit" loading={mutation.isPending} disabled={!form.firstName.trim() || !form.lastName.trim()}>{person ? 'Save profile' : 'Create profile'}</Button></Group></Stack></form></Stack></Box>
    <Box className="obo-panel" p="lg"><Stack gap="md"><Box><Title order={3}>Account</Title><Text size="sm" c="dimmed" mt={4}>Authentication and account identity are managed separately from your Person profile.</Text></Box><Divider /><Group justify="space-between"><Box><Text fw={600}>{account?.email ?? 'Authenticated user'}</Text><Text size="sm" c="dimmed">Account email</Text></Box><Badge variant="light" color="green">Authenticated</Badge></Group></Stack></Box>
    {professionalEnabled && <Box className="obo-panel" p="lg"><ApplicationStatus application={unwrap(professionalQuery.data)} error={professionalQuery.error} /></Box>}
  </Stack>
}
