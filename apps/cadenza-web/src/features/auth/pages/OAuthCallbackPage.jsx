import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, Card, Center, Loader, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../components/AuthProvider'

const ERROR_MESSAGES = { oauth_denied: 'OAuth sign-in was cancelled or denied.', invalid_oauth_state: 'The OAuth sign-in session expired or was invalid. Please try again.', oauth_unauthorized: 'The OAuth account could not be authenticated.', account_exists: 'An account already exists with this email address. Sign in with that account instead.', oauth_failed: 'OAuth sign-in failed. Please try again.', oauth_link_conflict: 'That social account is already linked to another account.', oauth_link_failed: 'The social account could not be linked.', }

export default function OAuthCallbackPage({ mode = 'success' }) {
  const navigate = useNavigate(); const [searchParams] = useSearchParams(); const { refresh } = useAuth(); const [error, setError] = useState('')
  useEffect(() => { let cancelled = false; const complete = async () => { if (mode === 'failure') { if (!cancelled) setError(ERROR_MESSAGES[searchParams.get('error')] ?? 'OAuth sign-in failed. Please try again.'); return }; const session = await refresh(); if (cancelled) return; if (session?.accessToken) { navigate('/dashboard', { replace: true }); return }; setError('OAuth sign-in completed, but the application could not establish your session.') }; complete().catch(() => { if (!cancelled) setError('OAuth sign-in could not be completed. Please try again.') }); return () => { cancelled = true } }, [mode, navigate, refresh, searchParams])
  const isFailure = mode === 'failure' || Boolean(error)
  return <Center mih="100vh" p="md"><Card withBorder w="100%" maw={460} p="xl"><Stack align="center" gap="lg" ta="center">{!isFailure && <Loader aria-label="Completing sign in" />}<Box><Title order={3}>{isFailure ? (mode === 'failure' ? 'Sign-in failed' : 'Unable to sign you in') : 'Signing you in…'}</Title><Text c="dimmed" mt="sm">{isFailure ? error : 'Please wait while the server securely finishes authentication.'}</Text></Box>{isFailure && <Alert color="red" w="100%">{error}</Alert>}{isFailure && <Button onClick={() => navigate('/login', { replace: true })}>Back to sign in</Button>}</Stack></Card></Center>
}
