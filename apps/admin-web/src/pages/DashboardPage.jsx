import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Text } from '../../components/ui/text'
import { Heading } from '../../components/ui/heading'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'

const labels = {
  applications: 'Applications',
  appointments: 'Appointments',
  professionals: 'Professionals',
  verification: 'Professional Verification',
  'permit-types': 'Permit Types',
  receiving: 'Receiving',
  authorization: 'Authorization',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { context, isLoading, error } = useAuthorization()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const visible = (context?.navigation ?? []).filter((item) => item.visible)
  const activeModules = (context?.modules ?? []).filter((module) => module.isActive !== false)

  return <VStack space="lg" className="mx-auto w-full max-w-7xl">
    <VStack space="xs"><Text size="sm" className="text-muted-foreground">Administration</Text><Heading size="xl">Welcome, {name}</Heading><Text className="text-muted-foreground">Your workspace is driven by the authorization context supplied by the server.</Text></VStack>

    {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">Authorization context could not be loaded. Navigation and protected actions will remain unavailable until access is resolved.</Text></Card>}

    <HStack className="flex-wrap gap-3">
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Role</Text><Heading size="lg" className="mt-1">{context?.role?.name ?? context?.role?.key ?? '—'}</Heading></Card>
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Permissions</Text><Heading size="lg" className="mt-1">{context?.permissions?.length ?? 0}</Heading></Card>
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Active modules</Text><Heading size="lg" className="mt-1">{activeModules.length}</Heading></Card>
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Visible capabilities</Text><Heading size="lg" className="mt-1">{visible.length}</Heading></Card>
    </HStack>

    <VStack space="sm"><HStack className="items-end justify-between"><VStack space="none"><Heading size="md">Authorized workflow</Heading><Text size="sm" className="text-muted-foreground">Only capabilities granted by the server are shown.</Text></VStack>{isLoading && <Badge variant="outline"><BadgeText>Refreshing</BadgeText></Badge>}</HStack>
      <Box className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.filter((item) => item.key !== 'authorization').map((item) => <Link key={item.key} to={item.route} className="no-underline"><Card variant="outline" className="h-full p-5 transition-colors hover:bg-background-50"><VStack space="sm"><HStack className="items-center justify-between"><Heading size="sm">{labels[item.key] ?? item.name}</Heading><Badge variant="outline"><BadgeText>{item.permission}</BadgeText></Badge></HStack><Text size="sm" className="text-muted-foreground">Open the authorized workflow area.</Text></VStack></Card></Link>)}</Box>
    </VStack>

    {visible.some((item) => item.key === 'authorization') && <Link to="/authorization" className="no-underline"><Card variant="outline" className="p-5 transition-colors hover:bg-background-50"><VStack space="xs"><Text size="xs" className="text-muted-foreground">Platform security</Text><Heading size="md">Authorization administration</Heading><Text size="sm" className="text-muted-foreground">Manage modules, permissions, and role assignments.</Text></VStack></Card></Link>}
  </VStack>
}
