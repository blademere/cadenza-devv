import { NavLink } from 'react-router-dom'
import { Avatar, Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'

export default function Sidebar({ navigation = [], navigationLoading = false, user, role, onNavigate, onLogout }) {
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator'

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 2.25 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>EA</Avatar>
        <Box><Typography fontWeight={700}>Express App</Typography><Typography variant="caption" color="text.secondary">Admin Console</Typography></Box>
      </Stack>
      <Divider />
      <Box sx={{ px: 1.5, py: 2, flex: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>Platform</Typography>
        <List dense>
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <ListItemButton
                key={item.key || item.route}
                component={NavLink}
                to={item.route}
                onClick={onNavigate}
                sx={{ borderRadius: 1.5, mb: 0.25, '&.active': { bgcolor: 'action.selected', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } } }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}><Icon fontSize="small" /></ListItemIcon>
                <ListItemText primary={item.name} primaryTypographyProps={{ fontWeight: 'inherit' }} />
              </ListItemButton>
            )
          })}
          {navigationLoading && <ListItemText sx={{ px: 1.5, py: 1 }} primary="Loading navigation…" primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} />}
          {!navigationLoading && !navigation.length && <ListItemText sx={{ px: 1.5, py: 1 }} primary="No administrative access." primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} />}
        </List>
      </Box>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34 }}>{displayName.slice(0, 1).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={600} noWrap>{displayName}</Typography><Typography variant="caption" color="text.secondary" noWrap>{role || user?.email || 'Administrator'}</Typography></Box>
        </Stack>
        <Button fullWidth variant="outlined" size="small" startIcon={<LogoutIcon />} onClick={onLogout}>Sign out</Button>
      </Box>
    </Box>
  )
}
