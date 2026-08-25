import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authorizationApi } from './authorization.api'
import { useAuth } from '../auth/AuthProvider'

const AuthorizationContext = createContext(null)

// Authorization is session-scoped. Keep the cache outside the provider so a
// router remount, StrictMode effect replay, or route transition cannot issue
// another request for the same authenticated browser session.
let sessionContext = null
let sessionRequest = null
let sessionLoaded = false

const resetSessionAuthorization = () => {
  sessionContext = null
  sessionRequest = null
  sessionLoaded = false
}

export function AuthorizationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [context, setContext] = useState(() => sessionContext)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const load = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated) {
      resetSessionAuthorization()
      if (mountedRef.current) {
        setContext(null)
        setError(null)
        setIsLoading(false)
      }
      return null
    }

    if (!force && sessionLoaded) {
      if (mountedRef.current) setContext(sessionContext)
      return sessionContext
    }

    // Share the same request globally, not just within this provider instance.
    if (sessionRequest) return sessionRequest

    const request = (async () => {
      if (mountedRef.current) {
        setIsLoading(true)
        setError(null)
      }

      try {
        const nextContext = await authorizationApi.getContext()
        sessionContext = nextContext
        sessionLoaded = true

        if (mountedRef.current) setContext(nextContext)
        return nextContext
      } catch (nextError) {
        // Do not immediately retry a failed authorization check. A failed
        // request must be explicitly retried with force rather than becoming
        // a render/request loop.
        sessionContext = null
        sessionLoaded = false
        if (mountedRef.current) {
          setError(nextError)
          setContext(null)
        }
        return null
      } finally {
        sessionRequest = null
        if (mountedRef.current) setIsLoading(false)
      }
    })()

    sessionRequest = request
    return request
  }, [isAuthenticated])

  useEffect(() => {
    mountedRef.current = true

    if (!isAuthenticated) {
      resetSessionAuthorization()
      setContext(null)
      setError(null)
      setIsLoading(false)
      return undefined
    }

    void load()
    return undefined
  }, [isAuthenticated, load])

  const can = useCallback((permission) => {
    if (!permission) return false
    return context?.permissions?.includes(permission) ?? false
  }, [context])

  const isNavigationVisible = useCallback((key) => {
    return context?.navigation?.some(
      (item) => item.key === key && item.visible,
    ) ?? false
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
