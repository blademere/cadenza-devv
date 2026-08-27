import { AppBar, Chip, IconButton, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SecurityIcon from '@mui/icons-material/Security'

export default function TopBar({ onMenu }) {
  return (
    <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton edge="start" onClick={onMenu} aria-label="Open navigation" sx={{ mr: 1 }}><MenuIcon /></IconButton>
        <SecurityIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flex: 1 }}>Admin Console</Typography>
        <Chip size="small" label="Authorized" color="success" variant="outlined" />
      </Toolbar>
    </AppBar>
  )
}
