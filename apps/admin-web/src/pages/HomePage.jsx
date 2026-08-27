import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Box, Button, Card, CardContent, Chip, Container, Divider, Stack, Typography } from '@mui/material'

const highlights = [
  ['01', 'One clear starting point', 'A focused workspace that keeps the important actions easy to find.'],
  ['02', 'Secure by design', 'Modern authentication with email, Google, and Facebook sign-in.'],
  ['03', 'Ready to grow', 'A clean foundation for the authenticated features you will add next.'],
]

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const destination = isAuthenticated ? '/dashboard' : '/login'

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Stack component="header" direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 82 }}>
          <Link to="/" aria-label="Express App home" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'primary.main' }}>
                <Typography variant="caption" fontWeight={700} color="primary.contrastText">EA</Typography>
              </Box>
              <Typography variant="h6" fontWeight={700}>Express App</Typography>
            </Stack>
          </Link>
          <Stack direction="row" spacing={3} alignItems="center">
            <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Button component="a" href="#features" color="inherit">Why Express App</Button>
              <Button component="a" href="#experience" color="inherit">Experience</Button>
            </Stack>
            {!isLoading && <Button component={Link} to={destination} size="small" variant="contained">{isAuthenticated ? 'Open dashboard' : 'Sign in'}</Button>}
          </Stack>
        </Stack>
        <Divider />

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={6} alignItems="center" sx={{ py: { xs: 8, md: 12 } }}>
          <Stack spacing={3} sx={{ flex: 1 }}>
            <Chip label="● A simpler way to get things done" size="small" variant="outlined" color="info" sx={{ alignSelf: 'flex-start' }} />
            <Box>
              <Typography variant="h2" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: { xs: '2.5rem', md: '3.75rem' } }}>From sign-in to workspace,</Typography>
              <Typography variant="h2" sx={{ fontWeight: 700, letterSpacing: '-0.03em', color: 'primary.main', fontSize: { xs: '2.5rem', md: '3.75rem' } }}>everything flows.</Typography>
            </Box>
            <Typography color="text.secondary" sx={{ maxWidth: 680, lineHeight: 1.75 }}>A polished application experience with a clear public entry point, fast authentication, and a focused dashboard that puts the next action in front of you.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button component={Link} to={destination} size="large" variant="contained">{isAuthenticated ? 'Go to dashboard →' : 'Get started →'}</Button>
              <Button component="a" href="#features" size="large">Explore the experience</Button>
            </Stack>
            {isAuthenticated && <Typography variant="body2" color="text.secondary">Signed in as {user?.email || 'your account'}.</Typography>}
          </Stack>

          <Card variant="outlined" sx={{ display: { xs: 'none', lg: 'block' }, width: 360, flexShrink: 0 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box sx={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'primary.main' }}><Typography variant="caption" fontWeight={700} color="primary.contrastText">EA</Typography></Box>
                  <Chip label="Active" color="success" size="small" />
                </Stack>
                <Box><Typography variant="overline" color="text.secondary">YOUR WORKSPACE</Typography><Typography variant="h6">Everything is ready.</Typography></Box>
                <Box sx={{ height: 8, overflow: 'hidden', borderRadius: 4, bgcolor: 'action.hover' }}><Box sx={{ width: '100%', height: '100%', bgcolor: 'primary.main' }} /></Box>
                <Typography variant="caption" color="text.secondary">Secure session · 100% ready</Typography>
                <Stack direction="row" spacing={1}><Chip label="✓ Authenticated" color="success" size="small" variant="outlined" /><Chip label="↗ Next action" color="info" size="small" variant="outlined" /></Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Stack id="experience" direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ py: 4, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          {[['Built for clarity', 'Every screen has a purpose and a next step.'], ['Fast entry', 'Get from landing page to workspace without friction.'], ['Responsive', 'Designed to feel intentional on every screen size.']].map(([title, description]) => <Stack key={title} spacing={0.5} sx={{ flex: 1 }}><Typography variant="body2" fontWeight={700}>{title}</Typography><Typography variant="body2" color="text.secondary">{description}</Typography></Stack>)}
        </Stack>

        <Stack id="features" spacing={4} sx={{ py: { xs: 10, md: 14 } }}>
          <Stack spacing={1} sx={{ maxWidth: 680 }}>
            <Typography variant="overline" color="primary.main" fontWeight={700}>THE FOUNDATION</Typography>
            <Typography variant="h3">A better flow, not just a new look.</Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>The redesign keeps the existing authentication architecture while making the user journey much more obvious.</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {highlights.map(([number, title, description]) => <Card key={number} variant="outlined" sx={{ flex: 1 }}><CardContent><Stack spacing={2}><Typography variant="caption" color="primary.main" fontWeight={700}>{number}</Typography><Typography variant="h6">{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{description}</Typography></Stack></CardContent></Card>)}
          </Stack>
        </Stack>

        <Stack component="footer" direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 85, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={700}>Express App</Typography><Typography variant="caption" color="text.secondary">Secure. Focused. Ready.</Typography>
        </Stack>
      </Container>
    </Box>
  )
}
