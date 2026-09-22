import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/components/AuthProvider'
import { useAuthorization } from '../features/authorization/components/AuthorizationProvider'
import { navigation, normalizeNavigation } from '../config/navigation'
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

export default function CadenzaLayout() {
  const { user, logout } = useAuth()
  const { context } = useAuthorization()
  const visibleNavigation = useMemo(
    () => normalizeNavigation(navigation, context?.permissions),
    [context?.permissions],
  )

  return (
    <SidebarProvider>
      <Sidebar navigation={visibleNavigation} user={user} onLogout={() => void logout()} />
      <SidebarInset>
        <TopBar navigation={visibleNavigation} />
        <div className="flex min-h-0 flex-1 flex-col">
          <main id="cadenza-main" className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
