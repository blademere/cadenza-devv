import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/AuthProvider'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
