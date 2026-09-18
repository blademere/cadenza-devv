/* eslint-disable react-refresh/only-export-components -- provider and its hook share the application context boundary */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '../api/application-context.api'
import { useAuth } from '../../auth/components/AuthProvider'

const ApplicationContext = createContext(null)
export const APPLICATION_QUERY_KEY = ['application', 'context']

export function ApplicationProvider({ children }) {
  const { isAuthenticated, accessToken, setSession } = useAuth()
  const queryClient = useQueryClient()
  const selectionAttemptedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) selectionAttemptedRef.current = false
  }, [isAuthenticated, accessToken])

  const query = useQuery({
    queryKey: APPLICATION_QUERY_KEY,
    queryFn: async () => {
      const result = await applicationsApi.get('obo')
      return result?.app ?? result?.application ?? result
    },
    enabled: isAuthenticated && Boolean(accessToken),
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    if (!isAuthenticated || !accessToken || query.data?.key !== 'obo' || selectionAttemptedRef.current) return
    selectionAttemptedRef.current = true

    let cancelled = false
    const select = async () => {
      try {
        const session = await applicationsApi.select('obo')
        if (cancelled) return
        setSession(session)
        queryClient.setQueryData(APPLICATION_QUERY_KEY, session.application ?? query.data)
        await queryClient.invalidateQueries({ queryKey: ['authorization', 'context'] })
      } catch {
        // The API remains authoritative; protected OBO routes will reject
        // requests if an app-scoped session cannot be established.
      }
    }

    void select()
    return () => { cancelled = true }
  }, [isAuthenticated, accessToken, query.data, queryClient, setSession])

  const selectApplication = useCallback(async (appKey) => {
    const session = await applicationsApi.select(appKey)
    setSession(session)
    queryClient.setQueryData(APPLICATION_QUERY_KEY, session.application ?? null)
    await queryClient.invalidateQueries({ queryKey: ['authorization', 'context'] })
    return session
  }, [queryClient, setSession])

  const load = useCallback(async () => {
    if (!isAuthenticated) return null
    await queryClient.invalidateQueries({ queryKey: APPLICATION_QUERY_KEY })
    return queryClient.fetchQuery({
      queryKey: APPLICATION_QUERY_KEY,
      queryFn: async () => {
        const result = await applicationsApi.get('obo')
        return result?.app ?? result?.application ?? result
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
  }), [query.data, query.isLoading, query.error, load, selectApplication])

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>
}

export function useApplication() {
  const value = useContext(ApplicationContext)
  if (!value) throw new Error('useApplication must be used within ApplicationProvider.')
  return value
}
