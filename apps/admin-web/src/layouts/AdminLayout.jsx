import { NavLink, Outlet } from 'react-router-dom'
import { AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, Toolbar, Typography, useMediaQuery } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SecurityIcon from '@mui/icons-material/Security'
import LogoutIcon from '@mui/icons-material/Logout'
import { useTheme } from '@mui/material/styles'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'

const drawerWidth = 240

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const { context, can, isLoading: authorizationLoading } = useAuthorization()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator'
  const authorizationVisible = can('authorization:manage')
  const navigation = (context?.navigation ?? []).filter((item) => item.visible && item.key !== 'authorization')
  const adminNavigation = authorizationVisible ? [{ key: 'authorization', name: 'Authorization', route: '/authorization' }, ...navigation] : navigation

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 2.25 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>EA</Avatar>
        <Box>
          <Typography fontWeight={700}>Express App</Typography>
          <Typography variant="caption" color="text.secondary">Admin Console</Typography>
        </Box>
      </Stack>
      <Divider />
      <Box sx={{ px: 1.5, py: 2, flex: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>Platform</Typography>
        <List dense>
          {adminNavigation.map((item) => <ListItemButton key={item.key} component={NavLink} to={item.route} onClick={() => setMobileOpen(false)} sx={{ borderRadius: 1.5, '&.active': { bgcolor: 'action.selected', color: 'primary.main', fontWeight: 600 } }}>
            <ListItemText primary={item.name} />
          </ListItemButton>)}
          {authorizationLoading && <ListItemText sx={{ px: 1.5, py: 1 }} primary="Checking access…" primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} />}
          {!authorizationLoading && !adminNavigation.length && <ListItemText sx={{ px: 1.5, py: 1 }} primary="No administrative access." primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} />}
        </List>
      </Box>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34 }}>{displayName.slice(0, 1).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{displayName}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{context?.role?.name ?? user?.email ?? 'Administrator'}</Typography>
          </Box>
        </Stack>
        <Button fullWidth variant="outlined" size="small" startIcon={<LogoutIcon />} onClick={() => void logout()}>Sign out</Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <a href="#main-content" style={{ position: 'absolute', left: -10000, top: 'auto' }}>Skip to content</a>
      {!desktop && <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar><IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><MenuIcon /></IconButton><SecurityIcon color="primary" sx={{ mx: 1 }} /><Typography variant="h6" sx={{ flex: 1 }}>Admin Console</Typography><Chip size="small" label="Authorized" color="success" variant="outlined" /></Toolbar>
      </AppBar>}
      {desktop ? <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>{drawer}</Drawer> : <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}>{drawer}</Drawer>}
      <Box component="main" id="main-content" sx={{ flex: 1, minWidth: 0, pt: desktop ? 0 : 8, p: { xs: 2, md: 4 } }}>
        {desktop && <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography variant="h5">Admin Console</Typography><Typography variant="body2" color="text.secondary">Platform authorization and access control</Typography></Box><Chip size="small" label="Authorized" color="success" variant="outlined" /></Stack>}
        {children ?? <Outlet />}
      </Box>
    </Box>
  )
}
