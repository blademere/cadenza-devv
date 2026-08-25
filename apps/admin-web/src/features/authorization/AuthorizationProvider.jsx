import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authorizationApi } from './authorization.api'
import { useAuth } from '../auth/AuthProvider'

const AuthorizationContext = createContext(null)

export function AuthorizationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [context, setContext] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setContext(null)
      return null
    }
    setIsLoading(true)
    setError(null)
    try {
      const nextContext = await authorizationApi.getContext()
      setContext(nextContext)
      return nextContext
    } catch (nextError) {
      setError(nextError)
      setContext(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { load() }, [load])

  const can = useCallback((permission) => {
    if (!permission) return false
    return new Set(context?.permissions ?? []).has(permission)
  }, [context])

  const isNavigationVisible = useCallback((key) => {
    return context?.navigation?.some((item) => item.key === key && item.visible) ?? false
  }, [context])

  const value = useMemo(() => ({
    context,
    isLoading,
    error,
    load,
    can,
    isNavigationVisible,
  }), [context, isLoading, error, load, can, isNavigationVisible])

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>
}

export function useAuthorization() {
  const value = useContext(AuthorizationContext)
  if (!value) throw new Error('useAuthorization must be used within AuthorizationProvider.')
  return value
}
