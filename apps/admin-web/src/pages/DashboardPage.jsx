import { Link } from 'react-router-dom'
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SecurityIcon from '@mui/icons-material/Security'
import AppsIcon from '@mui/icons-material/Apps'
import KeyIcon from '@mui/icons-material/Key'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

const Stat = ({ label, value, icon }) => (
  <Card sx={{ flex: '1 1 220px', minWidth: 0 }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box minWidth={0}><Typography variant="body2" color="text.secondary" noWrap>{label}</Typography><Typography variant="h5" sx={{ mt: 0.5 }}>{value}</Typography></Box>
        <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 2.5, bgcolor: 'primary.50', color: 'primary.main' }}>{icon}</Box>
      </Stack>
    </CardContent>
  </Card>
)

export default function DashboardPage() {
  const { user } = useAuth()
  const { context, isLoading, error } = useAuthorization()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const authorizationVisible = (context?.navigation ?? []).some((item) => item.visible && item.key === 'authorization')
  const activeModules = (context?.modules ?? []).filter((module) => module.isActive !== false)
  const permissions = context?.permissions ?? []

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Platform administration" title={`Welcome, ${name}`} description="Manage platform modules, roles, permissions, and administrative access." />
      {error && <Box role="alert" sx={{ p: 2, borderRadius: 2, bgcolor: 'error.50', color: 'error.dark', border: 1, borderColor: 'error.100' }}>{error.message ?? String(error)}</Box>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <Stat label="Current role" value={context?.role?.name ?? context?.role?.key ?? '—'} icon={<AdminPanelSettingsIcon />} />
        <Stat label="Permissions" value={permissions.length} icon={<KeyIcon />} />
        <Stat label="Enabled modules" value={activeModules.length} icon={<AppsIcon />} />
        <Stat label="Admin capability" value={authorizationVisible ? 'Granted' : 'Restricted'} icon={<SecurityIcon />} />
      </Stack>
      <Card>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
              <Box><Stack direction="row" spacing={1} alignItems="center"><Typography variant="h6">Authorization center</Typography>{authorizationVisible && <Chip size="small" label="Available" color="success" variant="outlined" />}</Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>The server determines which administrative capabilities are available to you.</Typography></Box>
              {isLoading && <Chip size="small" label="Checking access" variant="outlined" />}
            </Stack>
            {authorizationVisible ? <Button component={Link} to="/authorization" variant="contained" endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>Manage platform access</Button> : <Typography variant="body2" color="text.secondary">Your account does not currently have authorization-management access.</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
