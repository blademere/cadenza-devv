import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, Badge, Box, Burger, Drawer, Group, Stack, Text, useMatches } from '@mantine/core'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

const drawerWidth = 240

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { context, isLoading: authorizationLoading } = useAuthorization()
  const desktop = useMatches({ base: false, sm: false, lg: true })
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleNavigation = useMemo(() => normalizeNavigation(navigation, context?.permissions), [context?.permissions])
  const sidebar = <Sidebar navigation={visibleNavigation} navigationLoading={authorizationLoading} user={user} role={context?.role?.name} onNavigate={() => setMobileOpen(false)} onLogout={() => void logout()} />

  return (
    <AppShell navbar={{ width: drawerWidth, breakpoint: 'lg', collapsed: { mobile: true, desktop: false } }} header={{ height: 64, collapsed: { mobile: false, desktop: true } }} padding={0}>
      <AppShell.Header><TopBar onMenu={() => setMobileOpen(true)} /></AppShell.Header>
      <AppShell.Navbar>{sidebar}</AppShell.Navbar>
      {!desktop && <Drawer opened={mobileOpen} onClose={() => setMobileOpen(false)} size={drawerWidth} title="Navigation">{sidebar}</Drawer>}
      <AppShell.Main>
        <Box maw={1440} mx="auto" px={{ base: 'md', md: 'xl' }} py={{ base: 'md', md: 'xl' }}>
          {desktop && <Group justify="space-between" mb="xl"><Stack gap={0}><Text component="h1" fw={700} fz="h3" m={0}>Admin Console</Text><Text c="dimmed" size="sm">Platform authorization and access control</Text></Stack><Badge color="green" variant="light">Authorized</Badge></Group>}
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
