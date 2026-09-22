import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sheet, SheetContent } from '../components/ui/sheet'
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const visibleNavigation = useMemo(() => normalizeNavigation(navigation, context?.permissions), [context?.permissions])
  const sidebar = (collapsed = false) => <Sidebar navigation={visibleNavigation} navigationLoading={authorizationLoading} user={user} role={context?.role?.name} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} onLogout={() => void logout()} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} />

  return (
    <div className="cadenza-app min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"><TopBar onMenu={() => setMobileOpen(true)} navigation={visibleNavigation} onNavigate={() => setMobileOpen(false)} /></header>
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden border-r bg-sidebar lg:block" style={{ width: sidebarCollapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth }}>{sidebar(sidebarCollapsed)}</aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-80 bg-sidebar p-0">{sidebar(false)}</SheetContent></Sheet>
      <main className="min-h-screen pt-16" style={{ paddingLeft: sidebarCollapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth }}>
        <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2" href="#cadenza-main">Skip to content</a>
        <PageContainer><main id="cadenza-main"><Outlet /></main></PageContainer>
      </main>
    </div>
  )
}
