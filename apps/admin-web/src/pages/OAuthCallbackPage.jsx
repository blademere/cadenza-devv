import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CircularProgress, Stack, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import { useAuth } from '../features/auth/AuthProvider'

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
      if (mode === 'failure') {
        if (!cancelled) setError(ERROR_MESSAGES[searchParams.get('error')] ?? 'OAuth sign-in failed. Please try again.')
        return
      }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 460 }}>
        <Stack spacing={3} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
          {!isFailure && <CircularProgress aria-label="Completing sign in" />}
          <Box><Typography variant="h5">{isFailure ? (mode === 'failure' ? 'Sign-in failed' : 'Unable to sign you in') : 'Signing you in…'}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{isFailure ? error : 'Please wait while the server securely finishes authentication.'}</Typography></Box>
          {isFailure && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
          {isFailure && <Button variant="contained" startIcon={<LoginIcon />} onClick={() => navigate('/login', { replace: true })}>Back to sign in</Button>}
        </Stack>
      </Card>
    </Box>
  )
}
