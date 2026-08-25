import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { getOAuthLoginUrl } from '../features/auth/auth.api'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input, InputField } from '../../components/ui/input'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { Divider } from '../../components/ui/divider'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isBusy = isSubmitting || isLoading
  const handleSubmit = async (event) => { event.preventDefault(); setError(''); setIsSubmitting(true); try { await login({ email, password }); window.location.assign('/dashboard') } catch (requestError) { setError(requestError.message || 'Unable to sign in. Check your details and try again.') } finally { setIsSubmitting(false) } }
  const handleOAuthLogin = (provider) => { setError(''); window.location.assign(getOAuthLoginUrl(provider)) }

  return (
    <Box className="min-h-screen bg-background px-5 md:px-10">
      <Box className="mx-auto min-h-screen w-full max-w-6xl">
        <HStack className="min-h-[82px] items-center justify-between border-b border-border"><Link to="/" aria-label="Back to Express App home" className="no-underline"><HStack space="sm" className="items-center"><Box className="h-9 w-9 items-center justify-center rounded-xl bg-primary-600"><Text size="xs" bold className="text-white">EA</Text></Box><Text size="lg" bold className="text-foreground">Express App Admin</Text></HStack></Link><Link to="/" className="text-sm font-medium text-muted-foreground no-underline">Back to home</Link></HStack>
        <HStack className="items-center gap-12 py-12 md:py-20 lg:gap-20">
          <VStack space="lg" className="hidden flex-1 lg:flex"><Badge size="sm" variant="outline" action="info" className="self-start"><BadgeText>ADMIN WORKSPACE AWAITS</BadgeText></Badge><Heading size="3xl" className="max-w-xl tracking-tight text-foreground">Pick up exactly where you left off.</Heading><Text size="md" className="max-w-xl leading-7 text-muted-foreground">Sign in once and move straight into your focused administrative workspace.</Text><VStack space="md" className="pt-4">{[['One secure session', 'Stay authenticated across your workspace.'], ['Multiple sign-in options', 'Use email, Google, or Facebook.'], ['Clear next steps', 'Your dashboard is the destination.']].map(([title, description]) => <HStack key={title} space="md" className="items-start"><Box className="h-7 w-7 items-center justify-center rounded-full bg-success-50 dark:bg-success-950"><Text size="xs" bold className="text-success-700">✓</Text></Box><VStack space="xs" className="flex-1"><Text size="sm" bold className="text-foreground">{title}</Text><Text size="sm" className="text-muted-foreground">{description}</Text></VStack></HStack>)}</VStack></VStack>
          <Card size="lg" variant="elevated" className="w-full max-w-xl bg-card p-6 md:p-8"><VStack space="lg"><VStack space="xs"><Text size="sm" bold className="text-primary-600">WELCOME BACK</Text><Heading size="xl" className="text-foreground">Sign in to continue</Heading></VStack><VStack space="sm"><Button variant="outline" size="lg" onPress={() => handleOAuthLogin('google')} disabled={isBusy}><ButtonText>Continue with Google</ButtonText></Button><Button variant="outline" size="lg" onPress={() => handleOAuthLogin('facebook')} disabled={isBusy}><ButtonText>Continue with Facebook</ButtonText></Button></VStack><HStack space="md" className="items-center"><Divider className="flex-1" /><Text size="xs" className="text-muted-foreground">or use email</Text><Divider className="flex-1" /></HStack><form onSubmit={handleSubmit} noValidate><VStack space="md"><VStack space="xs"><Text size="sm" bold className="text-foreground">Email address</Text><Input size="lg"><InputField id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></Input></VStack><VStack space="xs"><HStack className="items-center justify-between"><Text size="sm" bold className="text-foreground">Password</Text><Text size="xs" className="text-muted-foreground">Required</Text></HStack><Input size="lg"><InputField id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" minLength={8} required /></Input></VStack>{error && <Text size="sm" className="text-error-600" role="alert">{error}</Text>}<Button size="lg" type="submit" disabled={isBusy}><ButtonText>{isSubmitting ? 'Signing you in…' : 'Sign in →'}</ButtonText></Button></VStack></form><Text size="xs" className="text-muted-foreground">● Your connection is protected by secure authentication.</Text></VStack></Card>
        </HStack>
        <Text size="xs" className="border-t border-border py-6 text-muted-foreground">© Express App • Secure access to your workspace</Text>
      </Box>
    </Box>
  )
}
