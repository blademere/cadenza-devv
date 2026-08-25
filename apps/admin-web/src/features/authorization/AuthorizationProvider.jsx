import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authorizationApi } from './authorization.api'
import { useAuth } from '../auth/AuthProvider'

const AuthorizationContext = createContext(null)

export function AuthorizationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [context, setContext] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestRef = useRef(null)

  const load = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated) {
      setContext(null)
      return null
    }
    if (requestRef.current) return requestRef.current
    if (!force && context) return context

    const request = (async () => {
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
        requestRef.current = null
      }
    })()

    requestRef.current = request
    return request
  }, [isAuthenticated, context])

  useEffect(() => {
    if (!isAuthenticated) {
      setContext(null)
      setError(null)
      return
    }
    void load()
  }, [isAuthenticated, load])

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
