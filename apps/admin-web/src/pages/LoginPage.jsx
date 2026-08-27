import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, Card, Divider, Stack, TextField, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import FacebookIcon from '@mui/icons-material/Facebook'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useAuth } from '../features/auth/AuthProvider'
import { getOAuthLoginUrl } from '../features/auth/auth.api'

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
    if (!normalizedEmail || !password) {
      setError('Enter your email address and password.')
      return
    }
    setIsSubmitting(true)
    try {
      await login({ email: normalizedEmail, password })
      window.location.assign('/dashboard')
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Check your details and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuthLogin = (provider) => {
    setError('')
    window.location.assign(getOAuthLoginUrl(provider))
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 1040 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 6 }} alignItems="stretch">
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', p: 3 }}>
            <Typography variant="overline" color="primary.main" fontWeight={700}>ADMIN WORKSPACE</Typography>
            <Typography variant="h2" sx={{ mt: 1, mb: 2 }}>Secure access to your platform console.</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520 }}>Sign in to manage authorization, users, and the administrative capabilities exposed by the Express server.</Typography>
          </Box>

          <Card variant="outlined" sx={{ width: '100%', maxWidth: 460, mx: 'auto' }}>
            <Stack spacing={3} sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack direction="row" spacing={1.5} alignItems="center"><Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}><LockOutlinedIcon fontSize="small" /></Box><Box><Typography variant="h5">Express App Admin</Typography><Typography variant="body2" color="text.secondary">Sign in to continue</Typography></Box></Stack>

              <Stack spacing={1.5}>
                <Button variant="outlined" size="large" startIcon={<GoogleIcon />} disabled={isBusy} onClick={() => handleOAuthLogin('google')}>Continue with Google</Button>
                <Button variant="outlined" size="large" startIcon={<FacebookIcon />} disabled={isBusy} onClick={() => handleOAuthLogin('facebook')}>Continue with Facebook</Button>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={2}><Divider sx={{ flex: 1 }} /><Typography variant="caption" color="text.secondary">OR USE EMAIL</Typography><Divider sx={{ flex: 1 }} /></Stack>

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                  <TextField label="Email address" id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required fullWidth disabled={isBusy} />
                  <TextField label="Password" id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" minLength={8} required fullWidth disabled={isBusy} />
                  {error && <Alert severity="error" role="alert">{error}</Alert>}
                  <Button variant="contained" size="large" type="submit" disabled={isBusy}>{isSubmitting ? 'Signing you in…' : 'Sign in'}</Button>
                </Stack>
              </Box>

              <Typography variant="caption" color="text.secondary">Authentication uses the server session and CSRF flow; credentials and tokens are not persisted in local storage.</Typography>
              <Button component={Link} to="/" variant="text" size="small">Back to home</Button>
            </Stack>
          </Card>
        </Stack>
      </Box>
    </Box>
  )
}
