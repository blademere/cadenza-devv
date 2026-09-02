import { Avatar, Box, Burger, Group, Text } from '@mantine/core'

export default function TopBar({ onMenu, user, role }) {
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator'
  return (
    <Group h="100%" px={{ base: 'md', md: 'xl' }} justify="space-between">
      <Group gap="sm">
        <Burger hiddenFrom="lg" onClick={onMenu} aria-label="Open navigation" size="sm" />
        <Box visibleFrom="lg">
          <Text size="sm" fw={650}>Administration</Text>
          <Text size="xs" c="dimmed">Manage your platform workspace</Text>
        </Box>
        <Box hiddenFrom="lg">
          <Text size="sm" fw={700}>Express App</Text>
        </Box>
      </Group>
      <Group gap="sm">
        <Box ta="right" visibleFrom="sm">
          <Text size="sm" fw={600}>{displayName}</Text>
          <Text size="xs" c="dimmed">{role || 'Administrator'}</Text>
        </Box>
        <Avatar size={34} radius="xl" color="indigo">{displayName.slice(0, 1).toUpperCase()}</Avatar>
      </Group>
    </Group>
  )
}
