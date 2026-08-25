import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Box } from '../../components/ui/box'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'

const ERROR_MESSAGES = {
  oauth_denied: 'OAuth sign-in was cancelled or denied.',
  invalid_oauth_state: 'The OAuth sign-in session expired or was invalid. Please try again.',
  oauth_unauthorized: 'The OAuth account could not be authenticated.',
  account_exists: 'An account already exists with this email address. Sign in with that account instead.',
  oauth_failed: 'OAuth sign-in failed. Please try again.',
  oauth_link_conflict: 'That social account is already linked to another account.',
  oauth_link_failed: 'The social account could not be linked.',
}

export default function OAuthCallbackPage({ mode = 'success' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refresh } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const complete = async () => {
      if (mode === 'failure') { if (!cancelled) setError(ERROR_MESSAGES[searchParams.get('error')] ?? 'OAuth sign-in failed. Please try again.'); return }
      const session = await refresh()
      if (cancelled) return
      if (session?.accessToken) { navigate('/dashboard', { replace: true }); return }
      setError('OAuth sign-in completed, but the application could not establish your session.')
    }
    complete().catch(() => { if (!cancelled) setError('OAuth sign-in could not be completed. Please try again.') })
    return () => { cancelled = true }
  }, [mode, navigate, refresh, searchParams])

  const isFailure = mode === 'failure' || Boolean(error)
  return (
    <Box className="min-h-screen items-center justify-center bg-background px-5">
      <Card size="lg" variant="elevated" className="w-full max-w-md bg-card p-8">
        <VStack space="lg" className="items-center text-center">
          <Box className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-600"><Text size="sm" bold className="text-white">EA</Text></Box>
          <VStack space="sm" className="items-center">
            <Heading size="xl" className="text-center text-foreground">{isFailure ? (mode === 'failure' ? 'Sign-in failed' : 'Unable to sign you in') : 'Signing you in…'}</Heading>
            <Text size="sm" className="text-center text-muted-foreground">{isFailure ? error : 'Please wait while we securely finish authentication.'}</Text>
          </VStack>
          {isFailure && <Button size="lg" onPress={() => navigate('/login', { replace: true })}><ButtonText>Back to sign in</ButtonText></Button>}
        </VStack>
      </Card>
    </Box>
  )
}
