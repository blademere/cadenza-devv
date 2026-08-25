import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'

const highlights = [
  ['01', 'One clear starting point', 'A focused workspace that keeps the important actions easy to find.'],
  ['02', 'Secure by design', 'Modern authentication with email, Google, and Facebook sign-in.'],
  ['03', 'Ready to grow', 'A clean foundation for the authenticated features you will add next.'],
]

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const destination = isAuthenticated ? '/dashboard' : '/login'

  return (
    <Box className="min-h-screen bg-background px-5 md:px-10">
      <Box className="mx-auto min-h-screen w-full max-w-6xl">
        <HStack className="min-h-[82px] items-center justify-between border-b border-border">
          <Link to="/" aria-label="Express App home" className="no-underline"><HStack space="sm" className="items-center"><Box className="h-9 w-9 items-center justify-center rounded-xl bg-primary-600"><Text size="xs" bold className="text-white">EA</Text></Box><Text size="lg" bold className="text-foreground">Express App</Text></HStack></Link>
          <HStack space="lg" className="items-center"><Box className="hidden items-center gap-6 md:flex"><a href="#features" className="text-sm text-muted-foreground no-underline">Why Express App</a><a href="#experience" className="text-sm text-muted-foreground no-underline">Experience</a></Box>{!isLoading && <Link to={destination} className="no-underline"><Button size="sm"><ButtonText>{isAuthenticated ? 'Open dashboard' : 'Sign in'}</ButtonText></Button></Link>}</HStack>
        </HStack>

        <HStack className="items-center gap-10 py-16 md:py-24">
          <VStack space="lg" className="flex-1">
            <Badge size="sm" variant="outline" action="info" className="self-start"><BadgeText>● A simpler way to get things done</BadgeText></Badge>
            <VStack space="xs"><Heading size="3xl" className="max-w-3xl tracking-tight text-foreground md:text-5xl">From sign-in to workspace,</Heading><Heading size="3xl" className="max-w-3xl tracking-tight text-primary-600 md:text-5xl">everything flows.</Heading></VStack>
            <Text size="md" className="max-w-2xl leading-7 text-muted-foreground">A polished application experience with a clear public entry point, fast authentication, and a focused dashboard that puts the next action in front of you.</Text>
            <HStack space="sm" className="items-center"><Link to={destination} className="no-underline"><Button size="lg"><ButtonText>{isAuthenticated ? 'Go to dashboard →' : 'Get started →'}</ButtonText></Button></Link><Button variant="link" size="lg" onPress={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}><ButtonText>Explore the experience</ButtonText></Button></HStack>
            {isAuthenticated && <Text size="sm" className="text-muted-foreground">Signed in as {user?.email || 'your account'}.</Text>}
          </VStack>
          <Card size="lg" variant="elevated" className="hidden w-[360px] bg-card p-6 lg:flex"><VStack space="lg"><HStack className="items-center justify-between"><Box className="h-10 w-10 items-center justify-center rounded-full bg-primary-600"><Text size="xs" bold className="text-white">EA</Text></Box><Badge action="success"><BadgeText>Active</BadgeText></Badge></HStack><VStack space="xs"><Text size="xs" bold className="tracking-widest text-muted-foreground">YOUR WORKSPACE</Text><Heading size="lg" className="text-foreground">Everything is ready.</Heading></VStack><Box className="h-2 overflow-hidden rounded-full bg-muted"><Box className="h-full w-full rounded-full bg-primary-600" /></Box><Text size="xs" className="text-muted-foreground">Secure session · 100% ready</Text><HStack space="sm"><Badge action="success"><BadgeText>✓ Authenticated</BadgeText></Badge><Badge action="info"><BadgeText>↗ Next action</BadgeText></Badge></HStack></VStack></Card>
        </HStack>

        <Box id="experience" className="grid grid-cols-1 gap-4 border-y border-border py-8 md:grid-cols-3">{[['Built for clarity', 'Every screen has a purpose and a next step.'], ['Fast entry', 'Get from landing page to workspace without friction.'], ['Responsive', 'Designed to feel intentional on every screen size.']].map(([title, description]) => <VStack key={title} space="xs"><Text size="sm" bold className="text-foreground">{title}</Text><Text size="sm" className="text-muted-foreground">{description}</Text></VStack>)}</Box>

        <VStack id="features" space="xl" className="py-20 md:py-28"><VStack space="sm" className="max-w-2xl"><Text size="xs" bold className="tracking-widest text-primary-600">THE FOUNDATION</Text><Heading size="2xl" className="text-foreground">A better flow, not just a new look.</Heading><Text size="md" className="leading-7 text-muted-foreground">The redesign keeps the existing authentication architecture while making the user journey much more obvious.</Text></VStack><Box className="grid grid-cols-1 gap-4 md:grid-cols-3">{highlights.map(([number, title, description]) => <Card key={number} size="lg" variant="outline" className="bg-card p-6"><VStack space="md"><Text size="xs" bold className="text-primary-600">{number}</Text><Heading size="md" className="text-foreground">{title}</Heading><Text size="sm" className="leading-6 text-muted-foreground">{description}</Text></VStack></Card>)}</Box></VStack>

        <HStack className="min-h-[85px] items-center justify-between border-t border-border"><Link to="/" className="no-underline"><Text size="sm" bold className="text-foreground">Express App</Text></Link><Text size="xs" className="text-muted-foreground">Secure. Focused. Ready.</Text></HStack>
      </Box>
    </Box>
  )
}
