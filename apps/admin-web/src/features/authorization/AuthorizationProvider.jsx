import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authorizationApi } from './authorization.api'
import { useAuth } from '../auth/AuthProvider'

const AuthorizationContext = createContext(null)

export function AuthorizationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [context, setContext] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Keep the authorization request and loaded state independent from React
  // render cycles. This prevents route guards, StrictMode, and context updates
  // from causing repeated /me/authorization requests.
  const requestRef = useRef(null)
  const contextRef = useRef(null)
  const loadedRef = useRef(false)

  const load = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated) {
      contextRef.current = null
      loadedRef.current = false
      setContext(null)
      return null
    }

    // One request at a time. Every caller receives the same promise.
    if (requestRef.current) return requestRef.current

    // Authorization is loaded once for the current authenticated session.
    // A caller must explicitly request a force reload after a permission
    // mutation; ordinary renders must never trigger another request.
    if (!force && loadedRef.current) return contextRef.current

    const request = (async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextContext = await authorizationApi.getContext()
        contextRef.current = nextContext
        loadedRef.current = true
        setContext(nextContext)
        return nextContext
      } catch (nextError) {
        setError(nextError)
        contextRef.current = null
        loadedRef.current = false
        setContext(null)
        return null
      } finally {
        setIsLoading(false)
        requestRef.current = null
      }
    })()

    requestRef.current = request
    return request
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      requestRef.current = null
      contextRef.current = null
      loadedRef.current = false
      setContext(null)
      setError(null)
      setIsLoading(false)
      return
    }

    // The provider is the single owner of the initial authorization check.
    // Do not put `load` in this dependency list: its identity may change when
    // authentication state changes, while authorization itself is session
    // scoped and must not be fetched on every render.
    void load()
  }, [isAuthenticated, load])

  const can = useCallback((permission) => {
    if (!permission) return false
    return contextRef.current?.permissions?.includes(permission) ?? false
  }, [context])

  const isNavigationVisible = useCallback((key) => {
    return contextRef.current?.navigation?.some(
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
