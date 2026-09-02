import { NavLink, useLocation } from 'react-router-dom'
import { Avatar, Box, Button, Divider, Group, NavLink as MantineNavLink, Stack, Text, ThemeIcon } from '@mantine/core'

const icons = {
  dashboard: '⌂',
  users: '♙',
  roles: '◆',
}

export default function Sidebar({ navigation = [], navigationLoading = false, user, role, onNavigate, onLogout }) {
  const location = useLocation()
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <Stack h="100%" gap={0}>
      <Box px="lg" py="lg">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 110 }}>
            <Text fw={800} size="sm">EA</Text>
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Text fw={750} lh={1.2}>Express App</Text>
            <Text size="xs" c="dimmed" mt={2}>Administration</Text>
          </Box>
        </Group>
      </Box>

      <Divider />

      <Box px="sm" py="lg" style={{ flex: 1, overflowY: 'auto' }}>
        <Text className="admin-section-label" px="sm" mb="xs">Workspace</Text>
        <Stack gap={3}>
          {navigation.map((item) => {
            const active = location.pathname === item.route || (
              item.route !== '/' && location.pathname.startsWith(`${item.route}/`)
            )
            return (
              <MantineNavLink
                key={item.key || item.route}
                component={NavLink}
                to={item.route}
                label={item.name}
                leftSection={<Text className="admin-nav-icon" fw={active ? 700 : 500}>{icons[item.key] || '•'}</Text>}
                active={active}
                onClick={onNavigate}
                styles={{ root: { borderRadius: 9, minHeight: 42 } }}
              />
            )
          })}
          {navigationLoading && (
            <Text size="xs" c="dimmed" px="sm" py="sm">Loading navigation…</Text>
          )}
          {!navigationLoading && !navigation.length && (
            <Text size="xs" c="dimmed" px="sm" py="sm">No administrative access.</Text>
          )}
        </Stack>
      </Box>

      <Box p="md">
        <Box className="admin-profile">
          <Group gap="sm" wrap="nowrap">
            <Avatar size="sm" radius="xl" color="indigo">{initial}</Avatar>
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" fw={650} truncate>{displayName}</Text>
              <Text size="xs" c="dimmed" truncate>{role || user?.email || 'Administrator'}</Text>
            </Box>
          </Group>
          <Button fullWidth mt="sm" variant="subtle" color="gray" size="sm" onClick={onLogout}>Sign out</Button>
        </Box>
      </Box>
    </Stack>
  )
}
