import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthorizationProvider } from '../features/authorization/AuthorizationProvider'
import { adminTheme } from './theme'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthorizationProvider>{children}</AuthorizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
