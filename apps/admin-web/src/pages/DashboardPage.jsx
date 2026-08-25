import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Avatar, AvatarFallbackText } from '../../components/ui/avatar'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'

function getDisplayName(user) {
  return user?.name || user?.email?.split('@')[0] || 'there'
}

const overview = [
  ['ACCOUNT STATUS', 'Authenticated', 'Your account is securely signed in and ready for the next action.', 'Active session'],
  ['ACCESS', 'Secure session', 'Authentication state is maintained by the application session flow.', 'Protected workspace'],
  ['NEXT', 'Workspace modules', 'Application modules, workflows, and administration tools will appear here.', 'Ready to expand'],
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const displayName = getDisplayName(user)

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <Box className="min-h-screen bg-background px-5 md:px-10">
      <Box className="mx-auto min-h-screen w-full max-w-6xl">
        <HStack className="min-h-[82px] items-center justify-between border-b border-border">
          <Link to="/dashboard" aria-label="Express App dashboard" className="no-underline">
            <HStack space="sm" className="items-center">
              <Avatar size="sm" className="bg-primary-600"><AvatarFallbackText>EA</AvatarFallbackText></Avatar>
              <Text size="lg" bold className="text-foreground">Express App Admin</Text>
            </HStack>
          </Link>
          <HStack space="md" className="items-center">
            <Text size="sm" className="max-w-72 truncate text-muted-foreground">{user?.email || 'Authenticated user'}</Text>
            <Button variant="outline" size="sm" onPress={handleLogout}>
              <ButtonText>Sign out</ButtonText>
            </Button>
          </HStack>
        </HStack>

        <HStack className="items-end justify-between gap-6 py-16 md:py-20">
          <VStack space="md" className="max-w-2xl">
            <Badge size="sm" variant="outline" action="info" className="self-start">
              <BadgeText>ADMIN WORKSPACE</BadgeText>
            </Badge>
            <Heading size="3xl" className="tracking-tight text-foreground md:text-5xl">Good to see you, {displayName}.</Heading>
            <Text size="md" className="text-muted-foreground">Manage the platform from one focused administrative workspace.</Text>
          </VStack>
          <Badge size="lg" action="success" variant="solid" className="hidden md:flex">
            <BadgeText>● All systems ready</BadgeText>
          </Badge>
        </HStack>

        <Box className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {overview.map(([label, value, description, meta]) => (
            <Card key={label} size="lg" variant="elevated" className="min-h-56 justify-between gap-6 bg-card p-6">
              <VStack space="sm">
                <Text size="xs" bold className="tracking-widest text-muted-foreground">{label}</Text>
                <Heading size="lg" className="text-foreground">{value}</Heading>
                <Text size="sm" className="leading-6 text-muted-foreground">{description}</Text>
              </VStack>
              <Text size="xs" bold className="text-muted-foreground">● {meta}</Text>
            </Card>
          ))}
        </Box>

        <VStack space="lg" className="py-20 md:py-28">
          <VStack space="xs">
            <Text size="xs" bold className="tracking-widest text-primary-600">ADMINISTRATION</Text>
            <Heading size="xl" className="text-foreground">Build your operational workspace.</Heading>
          </VStack>
          <Card size="lg" variant="outline" className="bg-card/70 p-6">
            <HStack space="lg" className="items-center">
              <Box className="h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950">
                <Text size="xl" bold className="text-primary-600">+</Text>
              </Box>
              <VStack space="xs" className="flex-1">
                <Text size="lg" bold className="text-foreground">Platform modules</Text>
                <Text size="sm" className="text-muted-foreground">Add users, professionals, permits, appointments, notifications, and other administrative workflows here.</Text>
              </VStack>
              <Button variant="ghost" size="icon" aria-label="Open modules">
                <ButtonText>→</ButtonText>
              </Button>
            </HStack>
          </Card>
        </VStack>

        <HStack className="min-h-[85px] items-center justify-between border-t border-border">
          <Text size="xs" className="text-muted-foreground">© Express App</Text>
          <Link to="/" className="text-sm font-medium text-muted-foreground no-underline">Back to landing page</Link>
        </HStack>
      </Box>
    </Box>
  )
}
