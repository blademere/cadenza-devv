import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, Box, Drawer, useMatches } from '@mantine/core'
import { useAuth } from '../features/auth/components/AuthProvider'
import { useAuthorization } from '../features/authorization/components/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import { layout } from '../config/layout'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

export default function OBOLayout() {
  const { user, logout } = useAuth()
  const { context, isLoading: authorizationLoading } = useAuthorization()
  const desktop = useMatches({ base: false, [layout.breakpoint]: true })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const visibleNavigation = useMemo(
    () => normalizeNavigation(navigation, context?.permissions),
    [context?.permissions],
  )

  const sidebar = (collapsed = false) => (
    <Sidebar
      navigation={visibleNavigation}
      navigationLoading={authorizationLoading}
      user={user}
      role={context?.role?.name}
      collapsed={collapsed}
      onNavigate={() => setMobileOpen(false)}
      onLogout={() => void logout()}
    />
  )

  return (
    <AppShell
      className="obo-app"
      navbar={{
        width: sidebarCollapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth,
        breakpoint: layout.breakpoint,
        collapsed: { mobile: true, desktop: false },
      }}
      padding={0}
    >
      <AppShell.Navbar className="obo-sidebar">
        {sidebar(sidebarCollapsed)}
      </AppShell.Navbar>

      {!desktop && (
        <Drawer
          opened={mobileOpen}
          onClose={() => setMobileOpen(false)}
          size={Math.min(layout.sidebarWidth + 24, 320)}
          withCloseButton={false}
          padding={0}
          classNames={{ content: 'obo-mobile-nav', body: 'obo-mobile-nav-body' }}
        >
          {sidebar(false)}
        </Drawer>
      )}

      <AppShell.Main>
        <Box component="header" className="obo-topbar">
          <TopBar
            onMenu={() => setMobileOpen(true)}
            navigation={visibleNavigation}
            onNavigate={() => setMobileOpen(false)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          />
        </Box>

        <Box
          className="obo-content"
          px={{ base: 'md', sm: 'lg', lg: 'xl' }}
          py={{ base: 'lg', md: 'xl' }}
        >
          <a className="obo-skip" href="#obo-main">
            Skip to content
          </a>
          <Box id="obo-main" component="main">
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
