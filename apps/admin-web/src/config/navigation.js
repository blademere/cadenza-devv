import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'

const metadata = {
  dashboard: { label: 'Dashboard', icon: DashboardOutlinedIcon },
  authorization: { label: 'Authorization', icon: AdminPanelSettingsOutlinedIcon },
  users: { label: 'Users', icon: PeopleOutlinedIcon },
  settings: { label: 'Settings', icon: SettingsOutlinedIcon },
  security: { label: 'Security', icon: SecurityOutlinedIcon },
}

export function getNavigationItem(item) {
  const config = metadata[item?.key] ?? {}
  return {
    ...item,
    name: item?.name || config.label || item?.key || 'Untitled',
    icon: config.icon || SecurityOutlinedIcon,
  }
}

export function normalizeNavigation(items = []) {
  if (!Array.isArray(items)) return []

  return items
    .filter(
      (item) =>
        item?.visible === true &&
        typeof item?.route === 'string' &&
        item.route.length > 0,
    )
    .map(getNavigationItem)
}
