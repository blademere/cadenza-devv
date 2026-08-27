import { createTheme } from '@mui/material/styles'

const surfaceShadow = '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)'

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', dark: '#3730a3', light: '#818cf8', contrastText: '#fff' },
    secondary: { main: '#0f766e', contrastText: '#fff' },
    background: { default: '#f7f8fc', paper: '#fff' },
    text: { primary: '#111827', secondary: '#667085' },
    divider: '#e7eaf0',
  },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    h1: { fontWeight: 750, letterSpacing: '-0.035em' },
    h2: { fontWeight: 750, letterSpacing: '-0.03em' },
    h3: { fontWeight: 750, letterSpacing: '-0.025em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 650 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { minWidth: 320, minHeight: '100%' },
        body: { margin: 0, minWidth: 320, minHeight: '100vh' },
        '*': { boxSizing: 'border-box' },
        a: { color: 'inherit' },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 9, minHeight: 40 } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #e7eaf0', boxShadow: surfaceShadow, backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 9, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b8c0cc' } } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
    MuiTableHead: { styleOverrides: { root: { backgroundColor: '#f8f9fc' } } },
  },
})
