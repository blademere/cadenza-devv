import { NavLink, useLocation } from 'react-router-dom'
import { Avatar, Box, Button, Divider, Group, NavLink as MantineNavLink, Stack, Text, ThemeIcon } from '@mantine/core'
import { branding } from '../../config/branding'

export default function Sidebar({ navigation = [], navigationLoading = false, user, role, onNavigate, onLogout }) {
  const location = useLocation()
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <Stack h="100%" gap={0}>
      <Box px="lg" py="lg">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 110 }}>
            <Text fw={800} size="sm">{branding.shortName}</Text>
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Text fw={750} lh={1.2}>{branding.name}</Text>
            <Text size="xs" c="dimmed" mt={2}>{branding.workspaceName}</Text>
          </Box>
        </Group>
      </Box>

      <Divider />

      <Box px="sm" py="lg" style={{ flex: 1, overflowY: 'auto' }}>
        <Stack gap="lg">
          {navigation.map((section) => (
            <Box key={section.key || section.name}>
              <Text className="obo-section-label" px="sm" mb="xs">{section.name}</Text>
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
                      styles={{ root: { borderRadius: 9, minHeight: 42 } }}
                    />
                  )
                })}
              </Stack>
            </Box>
          ))}
          {navigationLoading && (
            <Text size="xs" c="dimmed" px="sm" py="sm">Loading navigation…</Text>
          )}
          {!navigationLoading && !navigation.length && (
            <Text size="xs" c="dimmed" px="sm" py="sm">No available workspace access.</Text>
          )}
        </Stack>
      </Box>

      <Box p="md">
        <Box className="obo-profile">
          <Group gap="sm" wrap="nowrap">
            <Avatar size="sm" radius="xl" color="indigo">{initial}</Avatar>
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" fw={650} truncate>{displayName}</Text>
              <Text size="xs" c="dimmed" truncate>{role || user?.email || 'User'}</Text>
            </Box>
          </Group>
          <Button fullWidth mt="sm" variant="subtle" color="gray" size="sm" onClick={onLogout}>Sign out</Button>
        </Box>
      </Box>
    </Stack>
  )
}
