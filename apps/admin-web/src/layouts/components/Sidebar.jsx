import { NavLink, useLocation } from 'react-router-dom'
import { Avatar, Box, Button, Divider, Group, NavLink as MantineNavLink, Stack, Text } from '@mantine/core'

export default function Sidebar({ navigation = [], navigationLoading = false, user, role, onNavigate, onLogout }) {
  const location = useLocation()
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator'
  return <Stack h="100%" gap={0}>
    <Group px="lg" py="md" gap="sm"><Avatar variant="filled" radius="md" color="blue">EA</Avatar><Box><Text fw={700}>Express App</Text><Text size="xs" c="dimmed">Admin Console</Text></Box></Group>
    <Divider />
    <Box px="sm" py="md" style={{ flex: 1 }}><Text size="xs" fw={700} tt="uppercase" c="dimmed" px="sm" mb="xs">Platform</Text><Stack gap={4}>{navigation.map((item) => <MantineNavLink key={item.key || item.route} component={NavLink} to={item.route} label={item.name} active={location.pathname === item.route || (item.route !== '/' && location.pathname.startsWith(`${item.route}/`))} onClick={onNavigate} />)}{navigationLoading && <Text size="xs" c="dimmed" px="sm" py="xs">Loading navigation…</Text>}{!navigationLoading && !navigation.length && <Text size="xs" c="dimmed" px="sm" py="xs">No administrative access.</Text>}</Stack></Box>
    <Box p="md"><Group gap="sm" mb="sm" wrap="nowrap"><Avatar size="sm" radius="xl">{displayName.slice(0, 1).toUpperCase()}</Avatar><Box style={{ minWidth: 0 }}><Text size="sm" fw={600} truncate>{displayName}</Text><Text size="xs" c="dimmed" truncate>{role || user?.email || 'Administrator'}</Text></Box></Group><Button fullWidth variant="light" size="sm" onClick={onLogout}>Sign out</Button></Box>
  </Stack>
}
