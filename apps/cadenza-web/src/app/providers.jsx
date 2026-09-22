import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/components/AuthProvider'
import { AuthorizationProvider } from '../features/authorization/components/AuthorizationProvider'
import { ThemeProvider } from '../components/theme-provider'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="cadenza-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthorizationProvider>{children}</AuthorizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
