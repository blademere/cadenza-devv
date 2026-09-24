import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, Card, Divider, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { FacebookLogo, GoogleLogo } from '@phosphor-icons/react'
import { useAuth } from '../components/AuthProvider'
import { getOAuthLoginUrl } from '../api/auth.api'

const oauthIconProps = { size: 20, weight: 'regular', 'aria-hidden': true }

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isBusy = isSubmitting || isLoading

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isBusy) return
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) return setError('Enter your email address and password.')
    setIsSubmitting(true)
    try { await login({ email: normalizedEmail, password }); window.location.assign('/dashboard') }
    catch (requestError) { setError(requestError.message || 'Unable to sign in. Check your details and try again.') }
    finally { setIsSubmitting(false) }
  }

  const handleOAuthLogin = (provider) => { setError(''); window.location.assign(getOAuthLoginUrl(provider)) }

  return <Box mih="100vh" p={{ base: 'md', sm: 'xl' }} style={{ display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--mantine-color-body) 0%, var(--mantine-color-indigo-0) 100%)' }}>
    <Group align="center" justify="center" gap={{ base: 'xl', md: 70 }} w="100%" maw={1050}>
      <Stack flex={1} visibleFrom="md" px="md" gap="md">
        <Box w={48} h={48} bg="indigo" c="white" style={{ display: 'grid', placeItems: 'center', borderRadius: 12, fontWeight: 800 }}>EA</Box>
        <Text size="xs" fw={700} c="indigo" lts="0.1em">OBO WORKSPACE</Text>
        <Title order={1} size={48}>A calmer way to manage OBO operations.</Title>
        <Text c="dimmed" size="lg" lh={1.75} maw={520}>Secure access to plan permits, receiving, professionals, inspections, users, and authorization.</Text>
      </Stack>
      <Card withBorder shadow="sm" radius="md" w="100%" maw={450} p={{ base: 'lg', sm: 'xl' }}>
        <Stack gap="lg">
          <Box><Title order={2}>Welcome back</Title><Text size="sm" c="dimmed" mt={4}>Sign in to your OBO workspace.</Text></Box>
          <Stack gap="sm"><Button variant="default" size="md" disabled={isBusy} onClick={() => handleOAuthLogin('google')} leftSection={<GoogleLogo {...oauthIconProps} />}>Continue with Google</Button><Button variant="default" size="md" disabled={isBusy} onClick={() => handleOAuthLogin('facebook')} leftSection={<FacebookLogo {...oauthIconProps} />}>Continue with Facebook</Button></Stack>
          <Divider label="OR EMAIL" labelPosition="center" />
          <Box component="form" onSubmit={handleSubmit} noValidate><Stack gap="md"><TextInput label="Email address" type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} autoComplete="email" required disabled={isBusy} /><PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} autoComplete="current-password" required disabled={isBusy} />{error && <Alert color="red">{error}</Alert>}<Button color="indigo" size="md" type="submit" loading={isSubmitting} disabled={isBusy}>Sign in</Button></Stack></Box>
          <Text size="xs" c="dimmed">Authentication uses the server session and CSRF flow. Credentials and tokens are not persisted in local storage.</Text>
          <Button component={Link} to="/" variant="subtle" size="sm">Back to home</Button>
        </Stack>
      </Card>
    </Group>
  </Box>
}
