/* eslint-disable react-refresh/only-export-components -- provider and its hook share the context boundary */
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authorizationApi } from '../api/authorization.api'
import { useAuth } from '../../auth/components/AuthProvider'

const AuthorizationContext = createContext(null)
export const AUTHORIZATION_QUERY_KEY = ['authorization', 'context']

const QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0,
  retry: false,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}

export function AuthorizationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) queryClient.removeQueries({ queryKey: AUTHORIZATION_QUERY_KEY })
  }, [isAuthenticated, queryClient])

  const query = useQuery({
    queryKey: AUTHORIZATION_QUERY_KEY,
    queryFn: authorizationApi.getContext,
    enabled: isAuthenticated,
    ...QUERY_OPTIONS,
  })

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: AUTHORIZATION_QUERY_KEY })
      return null
    }

    await queryClient.invalidateQueries({ queryKey: AUTHORIZATION_QUERY_KEY })
    return queryClient.fetchQuery({
      queryKey: AUTHORIZATION_QUERY_KEY,
      queryFn: authorizationApi.getContext,
      ...QUERY_OPTIONS,
    })
  }, [isAuthenticated, queryClient])

  const can = useCallback(
    (permission) => Boolean(permission) && query.data?.permissions?.includes(permission) === true,
    [query.data],
  )

  const value = useMemo(
    () => ({
      context: query.data ?? null,
      isLoading: query.isLoading,
      error: query.error,
      load,
      can,
    }),
    [query.data, query.isLoading, query.error, load, can],
  )

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>
}

export function useAuthorization() {
  const value = useContext(AuthorizationContext)
  if (!value) throw new Error('useAuthorization must be used within AuthorizationProvider.')
  return value
}
