import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Chip, Drawer, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useAuth } from '../features/auth/AuthProvider'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { normalizeNavigation } from '../config/navigation'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

const drawerWidth = 240

const getEffectiveNavigation = (context) => {
  if (!context || !Array.isArray(context.navigation)) return []

  const permissions = new Set(Array.isArray(context.permissions) ? context.permissions : [])
  const activeModules = new Set(
    (Array.isArray(context.modules) ? context.modules : [])
      .filter((module) => module?.isActive !== false)
      .map((module) => module.key),
  )

  // The server is the source of truth, but the client deliberately derives
  // visibility from the returned permission/module state as well. This keeps
  // navigation synchronized immediately after an administrator changes a
  // role instead of trusting a stale `navigation[].visible` value.
  return context.navigation.map((item) => ({
    ...item,
    visible:
      item?.visible === true &&
      activeModules.has(item?.moduleKey) &&
      permissions.has(item?.permission),
  }))
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { context, isLoading: authorizationLoading } = useAuthorization()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigation = useMemo(
    () => normalizeNavigation(getEffectiveNavigation(context)),
    [context],
  )

  const sidebar = (
    <Sidebar
      navigation={navigation}
      navigationLoading={authorizationLoading}
      user={user}
      role={context?.role?.name}
      onNavigate={() => setMobileOpen(false)}
      onLogout={() => void logout()}
    />
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <a href="#main-content" style={{ position: 'absolute', left: -10000, top: 'auto' }}>Skip to content</a>
      {desktop ? (
        <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>
          {sidebar}
        </Drawer>
      ) : (
        <>
          <TopBar onMenu={() => setMobileOpen(true)} />
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}>
            {sidebar}
          </Drawer>
        </>
      )}

      <Box component="main" id="main-content" sx={{ flex: 1, minWidth: 0, pt: desktop ? 0 : 8 }}>
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, maxWidth: 1440, mx: 'auto' }}>
          {desktop && <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box><Box component="h1" sx={{ typography: 'h5', m: 0 }}>Admin Console</Box><Box component="p" sx={{ typography: 'body2', color: 'text.secondary', m: 0, mt: 0.5 }}>Platform authorization and access control</Box></Box>
            <Chip size="small" label="Authorized" color="success" variant="outlined" />
          </Box>}
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
