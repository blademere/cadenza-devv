/* eslint-disable react-refresh/only-export-components -- provider and its hook share the application context boundary */
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '../api/applications.api'
import { authorizationApi } from '../../authorization/api/authorization.api'
import { useAuth } from '../../auth/components/AuthProvider'

const ApplicationContext = createContext(null)
export const APPLICATION_QUERY_KEY = ['application', 'context']

export function ApplicationProvider({ children }) {
  const { isAuthenticated, accessToken } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: APPLICATION_QUERY_KEY,
    queryFn: async () => {
      const result = await applicationsApi.get('obo')
      return result?.application ?? result
    },
    enabled: isAuthenticated && Boolean(accessToken),
    staleTime: 60_000,
    retry: false,
  })

  const selectApplication = useCallback(async (appKey) => {
    const session = await applicationsApi.select(appKey)
    if (session?.accessToken) {
      const current = queryClient.getQueryData(APPLICATION_QUERY_KEY)
      queryClient.setQueryData(APPLICATION_QUERY_KEY, session.application ?? current)
    }
    await queryClient.invalidateQueries({ queryKey: ['authorization', 'context'] })
    return session
  }, [queryClient])

  const load = useCallback(async () => {
    if (!isAuthenticated) return null
    await queryClient.invalidateQueries({ queryKey: APPLICATION_QUERY_KEY })
    await queryClient.invalidateQueries({ queryKey: ['authorization', 'context'] })
    return queryClient.fetchQuery({
      queryKey: APPLICATION_QUERY_KEY,
      queryFn: async () => {
        const result = await applicationsApi.get('obo')
        return result?.application ?? result
      },
      staleTime: 60_000,
      retry: false,
    })
  }, [isAuthenticated, queryClient])

  const value = useMemo(() => ({
    application: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    load,
    selectApplication,
    isOBO: query.data?.key === 'obo',
    permissions: queryClient.getQueryData(['authorization', 'context'])?.permissions ?? [],
    authorization: authorizationApi,
  }), [query.data, query.isLoading, query.error, load, selectApplication, queryClient])

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>
}

export function useApplication() {
  const value = useContext(ApplicationContext)
  if (!value) throw new Error('useApplication must be used within ApplicationProvider.')
  return value
}
