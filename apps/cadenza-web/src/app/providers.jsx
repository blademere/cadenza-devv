import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/components/AuthProvider'
import { AuthorizationProvider } from '../features/authorization/components/AuthorizationProvider'
import { cadenzaTheme } from './theme'
const queryClient=new QueryClient()
export function AppProviders({children}){return <MantineProvider theme={cadenzaTheme} defaultColorScheme="light"><QueryClientProvider client={queryClient}><AuthProvider><AuthorizationProvider>{children}</AuthorizationProvider></AuthProvider></QueryClientProvider></MantineProvider>}
