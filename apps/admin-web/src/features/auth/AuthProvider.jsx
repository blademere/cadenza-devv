import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from './auth.api'
import { apiClient } from '../../services/api/client'

const AuthContext = createContext(null)
let globalRefreshPromise = null

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshPromiseRef = useRef(null)

  const applySession = useCallback((session) => {
    const token = session?.accessToken ?? null
    setAccessToken(token)
    apiClient.setAccessToken(token)

    if (session?.csrfToken) apiClient.setCsrfToken(session.csrfToken)
    if (session?.user !== undefined) setUser(session.user)
  }, [])

  const login = useCallback(async (credentials) => {
    const session = await authApi.login(credentials)
    applySession(session)
    return session
  }, [applySession])

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current
    if (globalRefreshPromise) return globalRefreshPromise

    const refreshPromise = (async () => {
      try {
        await authApi.csrf()
        const session = await authApi.refresh()
        applySession(session)
        const currentUser = await authApi.me()
        setUser(currentUser.user)
        return { ...session, user: currentUser.user }
      } catch (error) {
        if (error.status === 401 || error.status === 400) {
          setAccessToken(null)
          setUser(null)
          apiClient.clearAccessToken()
        }
        return null
      } finally {
        refreshPromiseRef.current = null
        globalRefreshPromise = null
      }
    })()

    refreshPromiseRef.current = refreshPromise
    globalRefreshPromise = refreshPromise
    return refreshPromise
  }, [applySession])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setAccessToken(null)
      setUser(null)
      apiClient.clearAccessToken()
    }
  }, [])

  useEffect(() => {
    apiClient.setRefreshHandler(refresh)
    return () => apiClient.setRefreshHandler(null)
  }, [refresh])

  useEffect(() => {
    const isOAuthCallback = window.location.pathname === '/auth/callback/success'
      || window.location.pathname === '/auth/callback/failure'

    if (isOAuthCallback) {
      setIsLoading(false)
      return
    }

    refresh().finally(() => setIsLoading(false))
  }, [refresh])

  const value = useMemo(() => ({
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken),
    isLoading,
    login,
    refresh,
    logout,
  }), [accessToken, user, isLoading, login, refresh, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
