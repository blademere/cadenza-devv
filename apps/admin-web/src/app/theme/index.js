import { createTheme } from '@mui/material/styles'

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#635bff' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    text: { primary: '#172033', secondary: '#697386' },
    divider: '#e6e8ed',
  },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700 }, h2: { fontWeight: 700 }, h3: { fontWeight: 700 },
    h4: { fontWeight: 700 }, h5: { fontWeight: 700 }, h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: { styleOverrides: { html: { minWidth: 320, minHeight: '100%' }, body: { margin: 0, minWidth: 320, minHeight: '100vh' }, '*': { boxSizing: 'border-box' }, 'button, input, textarea, select': { font: 'inherit' }, a: { color: 'inherit' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #e6e8ed', boxShadow: '0 1px 2px rgba(15,23,42,.03)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
  },
})
