import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, Drawer, useMatches } from '@mantine/core'
import { useAuth } from '../features/auth/components/AuthProvider'
import { useAuthorization } from '../features/authorization/components/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import { layout } from '../config/layout'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import PageContainer from './components/PageContainer'

export default function CadenzaLayout() {
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
      onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
    />
  )

  return (
    <AppShell
      className="cadenza-app"
      header={{ height: layout.headerHeight }}
      navbar={{
        width: sidebarCollapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth,
        breakpoint: layout.breakpoint,
        collapsed: { mobile: true, desktop: false },
      }}
      padding={0}
    >
      <AppShell.Header className="cadenza-topbar">
        <TopBar
          onMenu={() => setMobileOpen(true)}
          navigation={visibleNavigation}
          onNavigate={() => setMobileOpen(false)}
        />
      </AppShell.Header>

      <AppShell.Navbar className="cadenza-sidebar">
        {sidebar(sidebarCollapsed)}
      </AppShell.Navbar>

      {!desktop && (
        <Drawer
          opened={mobileOpen}
          onClose={() => setMobileOpen(false)}
          size={Math.min(layout.sidebarWidth + 24, 320)}
          withCloseButton={false}
          padding={0}
          classNames={{ content: 'cadenza-mobile-nav', body: 'cadenza-mobile-nav-body' }}
        >
          {sidebar(false)}
        </Drawer>
      )}

      <AppShell.Main>
        <a className="cadenza-skip" href="#cadenza-main">Skip to content</a>
        <PageContainer>
          <main id="cadenza-main">
            <Outlet />
          </main>
        </PageContainer>
      </AppShell.Main>
    </AppShell>
  )
}
