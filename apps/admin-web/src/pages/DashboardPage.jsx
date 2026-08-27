import { Link } from 'react-router-dom'
import { Box, Button, Card, Chip, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SecurityIcon from '@mui/icons-material/Security'
import AppsIcon from '@mui/icons-material/Apps'
import KeyIcon from '@mui/icons-material/Key'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

const Stat = ({ label, value, icon }) => (
  <Card variant="outlined" sx={{ flex: '1 1 220px' }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ p: 2.5 }}>
      <Box><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" sx={{ mt: 0.5 }}>{value}</Typography></Box>
      {icon}
    </Stack>
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
      <PageHeader eyebrow="Platform administration" title={`Welcome, ${name}`} description="Manage platform modules, roles, permissions, and administrative access. Authorization is always enforced by the server." />
      {error && <Box role="alert" sx={{ p: 2, borderRadius: 2, bgcolor: 'error.light', color: 'error.dark' }}>{error.message ?? String(error)}</Box>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <Stat label="Current role" value={context?.role?.name ?? context?.role?.key ?? '—'} icon={<AdminPanelSettingsIcon color="primary" />} />
        <Stat label="Permissions" value={permissions.length} icon={<KeyIcon color="primary" />} />
        <Stat label="Enabled modules" value={activeModules.length} icon={<AppsIcon color="primary" />} />
        <Stat label="Admin capability" value={authorizationVisible ? 'Granted' : 'Restricted'} icon={<SecurityIcon color={authorizationVisible ? 'success' : 'disabled'} />} />
      </Stack>
      <Card variant="outlined">
        <Stack spacing={2} sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
            <Box><Typography variant="h6">Authorization center</Typography><Typography variant="body2" color="text.secondary">The server determines which administrative capabilities are available to you.</Typography></Box>
            {isLoading && <Chip size="small" label="Checking access" variant="outlined" />}
          </Stack>
          {authorizationVisible ? <Button component={Link} to="/authorization" variant="contained" endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>Manage platform access</Button> : <Typography variant="body2" color="text.secondary">Your account does not currently have authorization-management access.</Typography>}
        </Stack>
      </Card>
    </Stack>
  )
}
