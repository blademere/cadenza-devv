import { createTheme } from '@mui/material/styles'

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', dark: '#3730a3', light: '#818cf8', contrastText: '#fff' },
    background: { default: '#f8fafc', paper: '#fff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e2e8f0',
    success: { main: '#15803d' }, warning: { main: '#b45309' }, error: { main: '#dc2626' },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    h1: { fontWeight: 750, letterSpacing: '-0.04em' }, h2: { fontWeight: 750, letterSpacing: '-0.035em' },
    h3: { fontWeight: 750, letterSpacing: '-0.03em' }, h4: { fontWeight: 750, letterSpacing: '-0.025em' },
    h5: { fontWeight: 700 }, h6: { fontWeight: 700 }, button: { textTransform: 'none', fontWeight: 650 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: { styleOverrides: { html: { minWidth: 320 }, body: { margin: 0, minWidth: 320, minHeight: '100vh' }, '*': { boxSizing: 'border-box' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8, minHeight: 40 } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15,23,42,.04)', backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 7, fontWeight: 600 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, color: '#475569', backgroundColor: '#f8fafc' } } },
  },
})
