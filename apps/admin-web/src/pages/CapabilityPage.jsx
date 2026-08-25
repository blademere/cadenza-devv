import { useLocation } from 'react-router-dom'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { VStack } from '../../components/ui/vstack'
import { Badge, BadgeText } from '../../components/ui/badge'

const routeToKey = {
  '/applications': 'applications',
  '/appointments': 'appointments',
  '/professionals': 'professionals',
  '/permit-types': 'permit-types',
}

export default function CapabilityPage() {
  const { pathname } = useLocation()
  const { context } = useAuthorization()
  const capability = context?.navigation?.find((item) => item.key === routeToKey[pathname])

  return <Card variant="outline" className="mx-auto w-full max-w-4xl p-6 md:p-8"><VStack space="md">
    <Badge variant="outline" className="self-start"><BadgeText>Authorized capability</BadgeText></Badge>
    <Heading size="xl">{capability?.name ?? 'Platform capability'}</Heading>
    <Text className="text-muted-foreground">This workspace is now authorization-aware. The server advertises this capability for your role, but the corresponding administrative collection endpoint is not exposed by the current server contract yet.</Text>
    <VStack space="xs" className="rounded-lg border border-outline-100 bg-background-50 p-4">
      <Text size="sm" bold>Backend contract</Text>
      <Text size="sm" className="text-muted-foreground">{capability?.permission ?? 'Permission is defined by the authorization context.'}</Text>
      <Text size="sm" className="text-muted-foreground">{capability?.route ?? pathname}</Text>
    </VStack>
  </VStack></Card>
}
