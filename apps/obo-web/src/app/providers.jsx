import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthorizationProvider } from '../features/authorization/AuthorizationProvider'
import { oboTheme } from './theme'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return (
    <MantineProvider theme={oboTheme} defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthorizationProvider>{children}</AuthorizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  )
}
