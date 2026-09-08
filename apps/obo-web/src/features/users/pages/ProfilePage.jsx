import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Alert, Badge, Box, Button, Divider, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
import LoadingState from '../../../components/common/LoadingState'
import { useAuth } from '../../auth/components/AuthProvider'
import { useMyProfessional } from '../../professionals/queries/professionals.queries'
import { useMyProfile } from '../queries/profile.queries'
import { useUpdateMyProfile } from '../mutations/profile.mutations'

const unwrap = (value) => value?.data ?? value

const normalizeRole = (role) => String(role?.name ?? role ?? '').trim().toLowerCase()

const roleConfig = {
  client: {
    title: 'Client Profile',
    description: 'Manage the personal information used for your OBO applications.',
    responsibility: 'Use this profile for your permit applications and other client transactions.',
  },
  professional: {
    title: 'Professional Profile',
    description: 'Manage your shared person profile and professional verification status.',
    responsibility: 'Your professional credentials are maintained separately from your personal information.',
  },
  administrator: {
    title: 'Administrator Profile',
    description: 'Manage your personal information for your administrative OBO workspace.',
    responsibility: 'Administrative permissions are controlled by your assigned role and permissions.',
  },
  'receiving officer': {
    title: 'Receiving Officer Profile',
    description: 'Manage your personal information for receiving and reviewing OBO applications.',
    responsibility: 'Receiving permissions are controlled by your assigned role and permissions.',
  },
}

function getRoleConfig(role) {
  if (role.includes('professional')) return roleConfig.professional
  if (role.includes('receiving')) return roleConfig['receiving officer']
  if (role.includes('admin')) return roleConfig.administrator
  return roleConfig.client
}

function ApplicationStatus({ application, error }) {
  if (error && error.status !== 404) {
    return <Alert color="red" title="Unable to load professional application">{error.message ?? 'The professional verification status could not be loaded.'}</Alert>
  }

  if (!application) {
    return (
      <Box>
        <Text fw={700}>Professional application</Text>
        <Text size="sm" c="dimmed" mt={4}>You have not submitted a professional verification application.</Text>
        <Button component={Link} to="/app/professionals/verification/apply" mt="md" variant="light">
          Apply for verification
        </Button>
      </Box>
    )
  }

  const status = String(application.status ?? application.verificationStatus ?? '').toUpperCase()
  const label = status === 'PENDING_VERIFICATION' ? 'Pending Verification' : status === 'VERIFIED' ? 'Verified' : status === 'DECLINED' ? 'Declined' : status || 'Unknown'
  const reason = application.verificationReason ?? application.declineReason ?? application.reason

  return (
    <Box>
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text fw={700}>Professional application</Text>
          <Text size="sm" c="dimmed" mt={4}>Your professional credentials are reviewed separately from your person profile.</Text>
        </Box>
        <Badge color={status === 'VERIFIED' ? 'green' : status === 'DECLINED' ? 'red' : 'yellow'} variant="light">
          {label}
        </Badge>
      </Group>
      {reason && <Alert color="red" title="Review reason" mt="md">{reason}</Alert>}
      <Button component={Link} to="/app/professionals/verification/apply" mt="md" variant="subtle">
        View verification
      </Button>
    </Box>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const query = useMyProfile()
  const mutation = useUpdateMyProfile()
  const role = normalizeRole(user?.role)
  const config = getRoleConfig(role)
  const isProfessional = role.includes('professional')
  const professionalQuery = useMyProfessional({ enabled: isProfessional })
  const profile = unwrap(query.data)
  const person = profile?.person
  const account = profile?.user ?? user
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

  return (
    <Stack className="obo-page" gap="lg">
      <PageHeader eyebrow="Account" title={config.title} description={config.description} />

      {mutation.error && <Alert color="red" title="Profile update failed">{mutation.error.message ?? 'Your profile could not be updated.'}</Alert>}
      {mutation.isSuccess && <Alert color="green" title="Profile updated">Your shared Person profile has been updated.</Alert>}

      <Box className="obo-panel" p="lg">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={3}>Personal information</Title>
              <Text size="sm" c="dimmed" mt={4}>{config.responsibility}</Text>
            </Box>
            <Badge variant="light" color="indigo">{account?.role?.name ?? user?.role?.name ?? 'User'}</Badge>
          </Group>

          <Divider />

          <form onSubmit={submit}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="First name" required value={form.firstName} onChange={setField('firstName')} />
                <TextInput label="Middle name" value={form.middleName} onChange={setField('middleName')} />
                <TextInput label="Last name" required value={form.lastName} onChange={setField('lastName')} />
                <TextInput label="Suffix" value={form.suffix} onChange={setField('suffix')} />
                <TextInput label="Phone" value={form.phone} onChange={setField('phone')} maxLength={50} />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button type="submit" loading={mutation.isPending} disabled={!form.firstName.trim() || !form.lastName.trim()}>Save profile</Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Box>

      <Box className="obo-panel" p="lg">
        <Stack gap="md">
          <Box>
            <Title order={3}>Account</Title>
            <Text size="sm" c="dimmed" mt={4}>Authentication and account identity are managed separately from your Person profile.</Text>
          </Box>
          <Divider />
          <Group justify="space-between">
            <Box>
              <Text fw={600}>{account?.email ?? 'Authenticated user'}</Text>
              <Text size="sm" c="dimmed">Account email</Text>
            </Box>
            <Badge variant="light" color="green">Authenticated</Badge>
          </Group>
        </Stack>
      </Box>

      {isProfessional && (
        <Box className="obo-panel" p="lg">
          <ApplicationStatus application={unwrap(professionalQuery.data)} error={professionalQuery.error} />
        </Box>
      )}
    </Stack>
  )
}
