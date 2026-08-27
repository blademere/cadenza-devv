import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material'
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
    if (!normalizedEmail || !password) return setError('Enter your email address and password.')
    setIsSubmitting(true)
    try { await login({ email: normalizedEmail, password }); window.location.assign('/dashboard') }
    catch (requestError) { setError(requestError.message || 'Unable to sign in. Check your details and try again.') }
    finally { setIsSubmitting(false) }
  }
  const handleOAuthLogin = (provider) => { setError(''); window.location.assign(getOAuthLoginUrl(provider)) }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: { xs: 2, sm: 4 }, background: 'linear-gradient(135deg, #f7f8fc 0%, #eef0ff 100%)' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 7 }} alignItems="center" sx={{ width: '100%', maxWidth: 1050 }}>
        <Stack spacing={2} sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, px: 2 }}>
          <Box sx={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}><LockOutlinedIcon /></Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '.1em' }}>ADMIN WORKSPACE</Typography>
          <Typography variant="h2" sx={{ maxWidth: 560 }}>A calmer way to manage your platform.</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 520, fontSize: '1.05rem', lineHeight: 1.75 }}>Secure access to users, authorization, modules, and the administrative capabilities exposed by the Express server.</Typography>
        </Stack>
        <Card sx={{ width: '100%', maxWidth: 450 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Stack spacing={3}>
              <Box><Typography variant="h5">Welcome back</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Sign in to your admin workspace.</Typography></Box>
              <Stack spacing={1.25}>
                <Button variant="outlined" size="large" startIcon={<GoogleIcon />} disabled={isBusy} onClick={() => handleOAuthLogin('google')}>Continue with Google</Button>
                <Button variant="outlined" size="large" startIcon={<FacebookIcon />} disabled={isBusy} onClick={() => handleOAuthLogin('facebook')}>Continue with Facebook</Button>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2}><Divider sx={{ flex: 1 }} /><Typography variant="caption" color="text.secondary">OR EMAIL</Typography><Divider sx={{ flex: 1 }} /></Stack>
              <Box component="form" onSubmit={handleSubmit} noValidate><Stack spacing={2}><TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required fullWidth disabled={isBusy} /><TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={8} required fullWidth disabled={isBusy} />{error && <Alert severity="error">{error}</Alert>}<Button variant="contained" size="large" type="submit" disabled={isBusy}>{isSubmitting ? 'Signing you in…' : 'Sign in'}</Button></Stack></Box>
              <Typography variant="caption" color="text.secondary">Authentication uses the server session and CSRF flow. Credentials and tokens are not persisted in local storage.</Typography>
              <Button component={Link} to="/" variant="text" size="small">Back to home</Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}
