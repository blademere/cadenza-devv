import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, Box, Drawer, useMatches } from '@mantine/core'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

const sidebarWidth = 252

export default function OBOLayout() {
  const { user, logout } = useAuth()
  const { context, isLoading: authorizationLoading } = useAuthorization()
  const desktop = useMatches({ base: false, lg: true })
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleNavigation = useMemo(
    () => normalizeNavigation(navigation, context?.permissions),
    [context?.permissions],
  )

  const sidebar = (
    <Sidebar
      navigation={visibleNavigation}
      navigationLoading={authorizationLoading}
      user={user}
      role={context?.role?.name}
      onNavigate={() => setMobileOpen(false)}
      onLogout={() => void logout()}
    />
  )

  return (
    <AppShell
      className="admin-app"
      navbar={{ width: sidebarWidth, breakpoint: 'lg', collapsed: { mobile: true, desktop: false } }}
      header={{ height: 68, collapsed: { mobile: false, desktop: true } }}
      padding={0}
    >
      <AppShell.Header className="admin-topbar">
        <TopBar onMenu={() => setMobileOpen(true)} user={user} role={context?.role?.name} />
      </AppShell.Header>
      <AppShell.Navbar className="admin-sidebar">{sidebar}</AppShell.Navbar>
      {!desktop && (
        <Drawer
          opened={mobileOpen}
          onClose={() => setMobileOpen(false)}
          size={sidebarWidth}
          title="Navigation"
          classNames={{ content: 'admin-mobile-nav', header: 'admin-mobile-nav' }}
        >
          {sidebar}
        </Drawer>
      )}
      <AppShell.Main>
        <Box className="admin-content" px={{ base: 'md', sm: 'lg', lg: 'xl' }} py={{ base: 'lg', md: 'xl' }}>
          <a className="admin-skip" href="#admin-main">Skip to content</a>
          <Box id="admin-main" component="main">
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
