import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/components/AuthProvider'
import { useAuthorization } from '../features/authorization/components/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import { SidebarInset, SidebarProvider } from '../components/ui/sidebar'
import AppSidebar from '../components/app-sidebar'
import SiteHeader from '../components/site-header'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { context } = useAuthorization()
  const visibleNavigation = useMemo(
    () => normalizeNavigation(navigation, context?.permissions),
    [context?.permissions],
  )

  return (
    <SidebarProvider>
      <AppSidebar
        navigation={visibleNavigation}
        user={user}
        onLogout={() => void logout()}
      />
      <SidebarInset>
        <SiteHeader navigation={visibleNavigation} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
