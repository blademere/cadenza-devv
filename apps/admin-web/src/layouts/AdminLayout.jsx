import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Text } from '../../components/ui/text'
import { Heading } from '../../components/ui/heading'
import { Button, ButtonText } from '../../components/ui/button'
import { Avatar, AvatarFallbackText } from '../../components/ui/avatar'
import { Badge, BadgeText } from '../../components/ui/badge'

const navigation = [{ to: '/dashboard', label: 'Dashboard', icon: '⌂' }]

function NavItem({ to, label, icon }) {
  return <NavLink to={to} end className={({ isActive }) => `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`}><Text size="sm" className="admin-nav-icon">{icon}</Text><Text size="sm">{label}</Text></NavLink>
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator'

  return <Box className="admin-app"><a href="#main-content" className="admin-skip">Skip to content</a><HStack className="min-h-screen items-stretch">
    <Box className="admin-sidebar hidden w-[230px] shrink-0 border-r px-4 py-5 lg:flex"><VStack className="h-full w-full" space="lg">
      <HStack className="items-center gap-3 px-2 py-1"><Box className="admin-brand-mark"><Text size="xs" bold className="text-white">EA</Text></Box><VStack space="none"><Text size="md" bold className="text-foreground">Express App</Text><Text className="admin-section-label">Admin</Text></VStack></HStack>
      <VStack space="xs" className="flex-1 pt-4"><Text className="admin-section-label px-3 pb-1">Workspace</Text>{navigation.map((item) => <NavItem key={item.to} {...item} />)}<Box className="my-2 h-px bg-border"/><Text className="admin-section-label px-3 pb-1">Management</Text>{['Applications','Professionals','Appointments','Users'].map((label) => <Box key={label} className="admin-nav-placeholder"><Text size="sm">{label}</Text><Badge size="sm" variant="outline"><BadgeText>Soon</BadgeText></Badge></Box>)}</VStack>
      <VStack space="sm"><Box className="admin-profile"><HStack className="items-center gap-3"><Avatar size="sm"><AvatarFallbackText>{displayName}</AvatarFallbackText></Avatar><VStack space="none" className="min-w-0 flex-1"><Text size="sm" bold className="truncate text-foreground">{displayName}</Text><Text size="2xs" className="truncate text-muted-foreground">{user?.email || 'Administrator'}</Text></VStack></HStack></Box><Button variant="outline" size="sm" onPress={logout}><ButtonText>Sign out</ButtonText></Button></VStack>
    </VStack></Box>
    <VStack className="min-w-0 flex-1"><HStack className="admin-topbar min-h-[64px] items-center justify-between border-b px-5 md:px-8"><HStack className="items-center gap-3"><Box className="admin-brand-mark lg:hidden"><Text size="xs" bold className="text-white">EA</Text></Box><VStack space="none"><Heading size="md" className="text-foreground">Admin Console</Heading><Text size="2xs" className="text-muted-foreground">Platform operations</Text></VStack></HStack><HStack className="items-center gap-3"><Badge action="success" variant="outline" className="hidden sm:flex"><BadgeText>Operational</BadgeText></Badge><Avatar size="sm"><AvatarFallbackText>{displayName}</AvatarFallbackText></Avatar></HStack></HStack><Box className="admin-mobile-nav border-b px-5 py-2 lg:hidden"><HStack className="gap-1 overflow-x-auto">{navigation.map((item) => <NavItem key={item.to} {...item} />)}</HStack></Box><Box id="main-content" role="main" className="flex-1 px-5 py-6 md:px-8 md:py-8"><Outlet/></Box></VStack>
  </HStack></Box>
}
