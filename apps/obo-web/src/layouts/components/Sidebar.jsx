import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Alert, Avatar, Box, Button, Divider, Group, Menu, Modal, NavLink as MantineNavLink, ScrollArea, SimpleGrid, Stack, Text, TextInput, ThemeIcon, UnstyledButton } from '@mantine/core'
import { CaretDown, CheckCircle, GearSix, SignOut, UserCircle, WarningCircle } from '@phosphor-icons/react'
import { branding } from '../../config/branding'
import { profileApi } from '../../features/auth/api/profile.api'

const emptyProfile = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  phone: '',
  address: {
    street: '',
    barangay: '',
    city: '',
    province: '',
    postalCode: '',
  },
}

const toForm = (profile) => ({
  firstName: profile?.firstName ?? '',
  middleName: profile?.middleName ?? '',
  lastName: profile?.lastName ?? '',
  suffix: profile?.suffix ?? '',
  phone: profile?.phone ?? '',
  address: {
    street: profile?.address?.street ?? '',
    barangay: profile?.address?.barangay ?? '',
    city: profile?.address?.city ?? '',
    province: profile?.address?.province ?? '',
    postalCode: profile?.address?.postalCode ?? '',
  },
})

const toPayload = (form) => ({
  firstName: form.firstName.trim(),
  middleName: form.middleName.trim() || null,
  lastName: form.lastName.trim(),
  suffix: form.suffix.trim() || null,
  phone: form.phone.trim() || null,
  address: Object.fromEntries(Object.entries(form.address).map(([key, value]) => [key, value.trim()])).some(([, value]) => value)
    ? Object.fromEntries(Object.entries(form.address).map(([key, value]) => [key, value.trim()]))
    : null,
})

export default function Sidebar({ navigation = [], navigationLoading = false, user, role, onNavigate, onLogout }) {
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const displayName = useMemo(() => {
    if (profile?.firstName || profile?.lastName) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    }
    return user?.name || user?.email?.split('@')[0] || 'User'
  }, [profile, user])
  const initial = displayName.slice(0, 1).toUpperCase()
  const email = user?.email || 'No email available'

  const openProfile = async () => {
    setProfileOpen(true)
    setProfileLoading(true)
    setError('')
    setSaved(false)
    try {
      const nextProfile = await profileApi.get()
      setProfile(nextProfile)
      setForm(toForm(nextProfile))
    } catch (requestError) {
      setProfile(null)
      setForm(emptyProfile)
      setError(requestError.message || 'Unable to load your profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const closeProfile = () => {
    if (saving) return
    setProfileOpen(false)
    setError('')
    setSaved(false)
  }

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateAddress = (field, value) => setForm((current) => ({ ...current, address: { ...current.address, [field]: value } }))

  const saveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const nextProfile = await profileApi.update(toPayload(form))
      setProfile(nextProfile)
      setForm(toForm(nextProfile))
      setSaved(true)
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack h="100%" gap={0} style={{ background: 'var(--mantine-color-body)' }}>
      <Box px="lg" py="lg">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 120 }}>
            <Text fw={800} size="sm">{branding.shortName}</Text>
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" lh={1.2} truncate>{branding.name}</Text>
            <Text size="xs" c="dimmed" mt={3} truncate>{branding.workspaceName}</Text>
          </Box>
        </Group>
      </Box>

      <Divider color="gray.2" />

      <ScrollArea px="sm" py="lg" style={{ flex: 1 }} scrollbarSize={4}>
        <Stack gap="lg">
          {navigation.map((section) => (
            <Box key={section.key || section.name}>
              <Text className="obo-section-label" px="sm" mb={6}>{section.name}</Text>
              <Stack gap={2}>
                {section.items.map((item) => {
                  const active = location.pathname === item.route || (item.route !== '/' && location.pathname.startsWith(`${item.route}/`))
                  const Icon = item.icon

                  return (
                    <MantineNavLink
                      key={item.key || item.route}
                      component={NavLink}
                      to={item.route}
                      label={item.name}
                      leftSection={Icon ? <Icon size={19} weight={active ? 'duotone' : 'regular'} /> : null}
                      active={active}
                      onClick={onNavigate}
                      variant="light"
                      styles={{
                        root: { borderRadius: 9, minHeight: 40, paddingLeft: 10, paddingRight: 10, color: active ? 'var(--mantine-color-indigo-7)' : 'var(--mantine-color-gray-7)', transition: 'background-color 140ms ease, color 140ms ease' },
                        label: { fontSize: 13, fontWeight: active ? 600 : 450 },
                        section: { marginRight: 10 },
                      }}
                    />
                  )
                })}
              </Stack>
            </Box>
          ))}
          {navigationLoading && <Text size="xs" c="dimmed" px="sm" py="sm">Loading navigation…</Text>}
          {!navigationLoading && !navigation.length && <Text size="xs" c="dimmed" px="sm" py="sm">No available workspace access.</Text>}
        </Stack>
      </ScrollArea>

      <Divider color="gray.2" />

      <Box p="sm">
        <Menu position="top-start" offset={8} shadow="md" width={240} withArrow withinPortal>
          <Menu.Target>
            <UnstyledButton w="100%" p="xs" style={{ borderRadius: 10 }} className="obo-account-trigger">
              <Group gap="sm" wrap="nowrap">
                <Avatar size={36} radius="xl" color="indigo">{initial}</Avatar>
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={550} truncate>{displayName}</Text>
                  <Text size="xs" c="dimmed" truncate>{role || 'Account'}</Text>
                </Box>
                <CaretDown size={15} aria-hidden />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Box px="sm" py={6}><Text size="xs" c="dimmed" fw={600}>ACCOUNT</Text></Box>
            <Menu.Item leftSection={<UserCircle size={18} />} onClick={() => void openProfile()}>My Profile</Menu.Item>
            <Menu.Item leftSection={<GearSix size={18} />} disabled>Account settings</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<SignOut size={18} />} onClick={onLogout}>Sign out</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>

      <Modal opened={profileOpen} onClose={closeProfile} title="My Profile" centered size="lg" radius="lg" closeOnClickOutside={!saving} closeOnEscape={!saving}>
        <Stack gap="lg" pb="sm">
          <Group wrap="nowrap" align="center">
            <Avatar size={64} radius="xl" color="indigo">{initial}</Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text size="lg" fw={700}>{displayName}</Text>
              <Text size="sm" c="dimmed" mt={2}>{role || 'Account'}</Text>
            </Box>
          </Group>

          {error && <Alert color="red" variant="light" icon={<WarningCircle size={18} />}>{error}</Alert>}
          {saved && <Alert color="green" variant="light" icon={<CheckCircle size={18} />}>Your personal information has been saved.</Alert>}

          {profileLoading ? (
            <Text size="sm" c="dimmed">Loading personal information…</Text>
          ) : (
            <>
              <Box>
                <Text size="sm" fw={700} mb="sm">Personal information</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput label="First name" required value={form.firstName} onChange={(event) => updateField('firstName', event.currentTarget.value)} />
                  <TextInput label="Last name" required value={form.lastName} onChange={(event) => updateField('lastName', event.currentTarget.value)} />
                  <TextInput label="Middle name" value={form.middleName} onChange={(event) => updateField('middleName', event.currentTarget.value)} />
                  <TextInput label="Suffix" placeholder="Jr., Sr., III" value={form.suffix} onChange={(event) => updateField('suffix', event.currentTarget.value)} />
                  <TextInput label="Phone" placeholder="09XX XXX XXXX" value={form.phone} onChange={(event) => updateField('phone', event.currentTarget.value)} />
                  <TextInput label="Email" value={email} readOnly description="Managed by your account credentials." />
                </SimpleGrid>
              </Box>

              <Box>
                <Text size="sm" fw={700} mb="sm">Address</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput label="Street / house number" value={form.address.street} onChange={(event) => updateAddress('street', event.currentTarget.value)} />
                  <TextInput label="Barangay" value={form.address.barangay} onChange={(event) => updateAddress('barangay', event.currentTarget.value)} />
                  <TextInput label="City / municipality" value={form.address.city} onChange={(event) => updateAddress('city', event.currentTarget.value)} />
                  <TextInput label="Province" value={form.address.province} onChange={(event) => updateAddress('province', event.currentTarget.value)} />
                  <TextInput label="Postal code" value={form.address.postalCode} onChange={(event) => updateAddress('postalCode', event.currentTarget.value)} />
                </SimpleGrid>
              </Box>

              <Group justify="space-between" pt="xs">
                <Group gap="xs"><CheckCircle size={18} weight="fill" /><Text size="sm" fw={500}>Active account</Text></Group>
                <Group>
                  <Button variant="default" onClick={closeProfile} disabled={saving}>Cancel</Button>
                  <Button onClick={() => void saveProfile()} loading={saving}>Save changes</Button>
                </Group>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  )
}
