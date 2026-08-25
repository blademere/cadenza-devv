import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthorizationProvider } from '../features/authorization/AuthorizationProvider'
import { MuiAppThemeProvider } from '../components/ui'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return (
    <MuiAppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthorizationProvider>{children}</AuthorizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MuiAppThemeProvider>
  )
}
