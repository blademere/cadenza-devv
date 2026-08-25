import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Text } from '../../components/ui/text'
import { Heading } from '../../components/ui/heading'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'

export default function DashboardPage() {
  const { user } = useAuth()
  const { context, isLoading, error } = useAuthorization()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const visible = (context?.navigation ?? []).filter((item) => item.visible && item.key === 'authorization')
  const activeModules = (context?.modules ?? []).filter((module) => module.isActive !== false)
  const permissions = context?.permissions ?? []

  return <VStack space="lg" className="mx-auto w-full max-w-6xl">
    <VStack space="xs"><Text size="sm" className="text-muted-foreground">Platform administration</Text><Heading size="xl">Welcome, {name}</Heading><Text className="max-w-2xl text-muted-foreground">Manage the platform's module availability and role-based access from one authorization console.</Text></VStack>
    {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">Authorization context could not be loaded. Administrative actions remain unavailable until access is resolved.</Text></Card>}
    <HStack className="flex-wrap gap-3">
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Current role</Text><Heading size="lg" className="mt-1">{context?.role?.name ?? context?.role?.key ?? '—'}</Heading></Card>
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Permissions</Text><Heading size="lg" className="mt-1">{permissions.length}</Heading></Card>
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Enabled modules</Text><Heading size="lg" className="mt-1">{activeModules.length}</Heading></Card>
      <Card variant="outline" className="min-w-[180px] flex-1 p-5"><Text size="xs" className="text-muted-foreground">Admin capability</Text><Heading size="lg" className="mt-1">{visible.length ? 'Granted' : 'Restricted'}</Heading></Card>
    </HStack>
    <Card variant="outline" className="p-6"><VStack space="md"><HStack className="items-center justify-between"><VStack space="xs"><Heading size="md">Authorization center</Heading><Text size="sm" className="text-muted-foreground">The server determines what you can administer.</Text></VStack>{isLoading && <Badge variant="outline"><BadgeText>Checking access</BadgeText></Badge>}</HStack><Link to="/authorization" className="no-underline"><Card variant="outline" className="p-5 transition-colors hover:bg-background-50"><VStack space="xs"><Text size="xs" className="text-muted-foreground">Modules · roles · permissions</Text><Heading size="sm">Manage platform access</Heading><Text size="sm" className="text-muted-foreground">Enable or disable modules and grant permissions to roles.</Text></VStack></Card></Link></VStack></Card>
  </VStack>
}
