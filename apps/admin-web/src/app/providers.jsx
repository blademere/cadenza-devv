import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/AuthProvider'
import { GluestackUIProvider } from '../../components/ui/gluestack-ui-provider'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return (
    <GluestackUIProvider mode="system">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
  )
}
