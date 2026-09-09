import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Avatar,
  Box,
  Divider,
  Group,
  Menu,
  Modal,
  NavLink as MantineNavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core'
import {
  CaretDown,
  CheckCircle,
  GearSix,
  SignOut,
  UserCircle,
} from '@phosphor-icons/react'
import { branding } from '../../config/branding'

export default function Sidebar({ navigation = [], navigationLoading = false, user, role, onNavigate, onLogout }) {
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const initial = displayName.slice(0, 1).toUpperCase()
  const email = user?.email || 'No email available'

  return (
    <Stack h="100%" gap={0} style={{ background: 'var(--mantine-color-body)' }}>
      <Box px="lg" py="lg">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={40} radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 120 }}>
            <Text fw={850} size="sm">{branding.shortName}</Text>
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Text fw={750} size="sm" lh={1.2} truncate>{branding.name}</Text>
            <Text size="xs" c="dimmed" mt={3} truncate>{branding.workspaceName}</Text>
          </Box>
        </Group>
      </Box>

      <Divider />

      <ScrollArea px="sm" py="md" style={{ flex: 1 }} scrollbarSize={5}>
        <Stack gap="xl">
          {navigation.map((section) => (
            <Box key={section.key || section.name}>
              <Text className="obo-section-label" px="sm" mb={7}>{section.name}</Text>
              <Stack gap={3}>
                {section.items.map((item) => {
                  const active = location.pathname === item.route || (
                    item.route !== '/' && location.pathname.startsWith(`${item.route}/`)
                  )
                  const Icon = item.icon

                  return (
                    <MantineNavLink
                      key={item.key || item.route}
                      component={NavLink}
                      to={item.route}
                      label={item.name}
                      leftSection={Icon ? <Icon /> : null}
                      active={active}
                      onClick={onNavigate}
                      variant="light"
                      styles={{
                        root: {
                          borderRadius: 10,
                          minHeight: 42,
                          fontWeight: 550,
                          transition: 'background-color 120ms ease, color 120ms ease',
                        },
                        section: { marginRight: 11 },
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

      <Divider />

      <Box p="sm">
        <Menu position="top-start" offset={8} shadow="md" width={240} withArrow withinPortal>
          <Menu.Target>
            <UnstyledButton
              w="100%"
              p="xs"
              style={{ borderRadius: 12 }}
              className="obo-account-trigger"
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar size={38} radius="xl" color="indigo">{initial}</Avatar>
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={650} truncate>{displayName}</Text>
                  <Text size="xs" c="dimmed" truncate>{role || 'Account'}</Text>
                </Box>
                <CaretDown size={16} weight="bold" aria-hidden />
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Box px="sm" py={6}>
              <Text size="xs" c="dimmed" fw={600}>ACCOUNT</Text>
            </Box>
            <Menu.Item leftSection={<UserCircle size={18} />} onClick={() => setProfileOpen(true)}>
              My Profile
            </Menu.Item>
            <Menu.Item leftSection={<GearSix size={18} />} disabled>
              Account settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<SignOut size={18} />} onClick={onLogout}>
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>

      <Modal
        opened={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="My Profile"
        centered
        size="md"
        radius="lg"
      >
        <Stack gap="lg" pb="sm">
          <Group wrap="nowrap">
            <Avatar size={64} radius="xl" color="indigo">{initial}</Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text size="lg" fw={750}>{displayName}</Text>
              <Text size="sm" c="dimmed" mt={2}>{role || 'Account'}</Text>
            </Box>
          </Group>

          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={650} tt="uppercase">Email</Text>
            <Text size="sm">{email}</Text>
          </Stack>

          <Group gap="xs">
            <CheckCircle size={18} weight="fill" />
            <Text size="sm" fw={550}>Active account</Text>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
