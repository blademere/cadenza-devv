import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, Box, Drawer, useMatches } from '@mantine/core'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import { layout } from '../config/layout'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

export default function OBOLayout() {
  const { user, logout } = useAuth()
  const { context, isLoading: authorizationLoading } = useAuthorization()
  const desktop = useMatches({ base: false, [layout.breakpoint]: true })
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
      className="obo-app"
      navbar={{
        width: layout.sidebarWidth,
        breakpoint: layout.breakpoint,
        collapsed: { mobile: true, desktop: false },
      }}
      header={{ height: layout.headerHeight, collapsed: { mobile: false, desktop: true } }}
      padding={0}
    >
      <AppShell.Header className="obo-topbar">
        <TopBar onMenu={() => setMobileOpen(true)} user={user} role={context?.role?.name} />
      </AppShell.Header>
      <AppShell.Navbar className="obo-sidebar">{sidebar}</AppShell.Navbar>
      {!desktop && (
        <Drawer
          opened={mobileOpen}
          onClose={() => setMobileOpen(false)}
          size={layout.sidebarWidth}
          title="Navigation"
          classNames={{ content: 'obo-mobile-nav', header: 'obo-mobile-nav' }}
        >
          {sidebar}
        </Drawer>
      )}
      <AppShell.Main>
        <Box className="obo-content" px={{ base: 'md', sm: 'lg', lg: 'xl' }} py={{ base: 'lg', md: 'xl' }}>
          <a className="obo-skip" href="#obo-main">Skip to content</a>
          <Box id="obo-main" component="main">
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
