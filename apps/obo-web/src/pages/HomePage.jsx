import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/components/AuthProvider'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'

const highlights = [
  [
    '01',
    'One clear starting point',
    'A focused workspace that keeps the important actions easy to find.',
  ],
  [
    '02',
    'Secure by design',
    'Modern authentication with email, Google, and Facebook sign-in.',
  ],
  [
    '03',
    'Ready to grow',
    'A clean foundation for the authenticated features you will add next.',
  ],
]

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const destination = isAuthenticated ? '/dashboard' : '/login'
  return (
    <Box mih="100vh">
      <Container size="lg">
        <Group component="header" justify="space-between" mih={82}>
          <Link
            to="/"
            aria-label="Express App home"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Group gap="sm">
              <Box
                w={36}
                h={36}
                bg="blue"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 8,
                }}
              >
                <Text size="xs" fw={700} c="white">
                  EA
                </Text>
              </Box>
              <Text fw={700} size="lg">
                Express App
              </Text>
            </Group>
          </Link>
          <Group gap="lg">
            <Group gap="lg" visibleFrom="md">
              <Button
                component="a"
                href="#features"
                variant="subtle"
                color="gray"
              >
                Why Express App
              </Button>
              <Button
                component="a"
                href="#experience"
                variant="subtle"
                color="gray"
              >
                Experience
              </Button>
            </Group>
            {!isLoading && (
              <Button component={Link} to={destination}>
                {isAuthenticated ? 'Open dashboard' : 'Sign in'}
              </Button>
            )}
          </Group>
        </Group>
        <Divider />
        <Group align="center" gap={60} py={{ base: 60, md: 100 }}>
          <Stack gap="lg" style={{ flex: 1 }}>
            <Badge variant="light" w="fit-content">
              ● A simpler way to get things done
            </Badge>
            <Box>
              <Title order={1} size={{ base: 40, md: 60 }}>
                From sign-in to workspace,
              </Title>
              <Title order={1} size={{ base: 40, md: 60 }} c="blue">
                everything flows.
              </Title>
            </Box>
            <Text c="dimmed" size="lg" maw={680} lh={1.75}>
              A polished application experience with a clear public entry point,
              fast authentication, and a focused dashboard that puts the next
              action in front of you.
            </Text>
            <Group>
              <Button component={Link} to={destination} size="lg">
                {isAuthenticated ? 'Go to dashboard →' : 'Get started →'}
              </Button>
              <Button component="a" href="#features" size="lg" variant="subtle">
                Explore the experience
              </Button>
            </Group>
            {isAuthenticated && (
              <Text size="sm" c="dimmed">
                Signed in as {user?.email || 'your account'}.
              </Text>
            )}
          </Stack>
          <Card withBorder w={360} visibleFrom="lg">
            <Stack gap="lg">
              <Group justify="space-between">
                <Box
                  w={40}
                  h={40}
                  bg="blue"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 20,
                  }}
                >
                  <Text size="xs" fw={700} c="white">
                    EA
                  </Text>
                </Box>
                <Badge color="green">Active</Badge>
              </Group>
              <Box>
                <Text size="xs" tt="uppercase" c="dimmed">
                  Your workspace
                </Text>
                <Title order={4}>Everything is ready.</Title>
              </Box>
              <Box
                h={8}
                bg="gray.1"
                style={{ overflow: 'hidden', borderRadius: 4 }}
              >
                <Box h="100%" w="100%" bg="blue" />
              </Box>
              <Text size="xs" c="dimmed">
                Secure session · 100% ready
              </Text>
              <Group>
                <Badge color="green" variant="light">
                  ✓ Authenticated
                </Badge>
                <Badge color="blue" variant="light">
                  ↗ Next action
                </Badge>
              </Group>
            </Stack>
          </Card>
        </Group>
        <SimpleGrid
          id="experience"
          cols={{ base: 1, md: 3 }}
          py="xl"
          style={{
            borderTop: '1px solid var(--mantine-color-gray-3)',
            borderBottom: '1px solid var(--mantine-color-gray-3)',
          }}
        >
          {[
            [
              'Built for clarity',
              'Every screen has a purpose and a next step.',
            ],
            [
              'Fast entry',
              'Get from landing page to workspace without friction.',
            ],
            [
              'Responsive',
              'Designed to feel intentional on every screen size.',
            ],
          ].map(([title, description]) => (
            <Box key={title}>
              <Text fw={700} size="sm">
                {title}
              </Text>
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
        <Stack id="features" gap="xl" py={100}>
          <Stack gap="xs" maw={680}>
            <Text size="xs" fw={700} c="blue" tt="uppercase">
              The foundation
            </Text>
            <Title order={2}>A better flow, not just a new look.</Title>
            <Text c="dimmed" lh={1.75}>
              The redesign keeps the existing authentication architecture while
              making the user journey much more obvious.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            {highlights.map(([number, title, description]) => (
              <Card key={number} withBorder>
                <Stack>
                  <Text size="xs" fw={700} c="blue">
                    {number}
                  </Text>
                  <Title order={4}>{title}</Title>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    {description}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
        <Group
          component="footer"
          justify="space-between"
          mih={85}
          style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
        >
          <Text size="sm" fw={700}>
            Express App
          </Text>
          <Text size="xs" c="dimmed">
            Secure. Focused. Ready.
          </Text>
        </Group>
      </Container>
    </Box>
  )
}
