import { useCallback } from 'react'
import { useAuthorization } from './components/AuthorizationProvider'

export function useCan() {
  const { can } = useAuthorization()
  return useCallback((permission) => can(permission), [can])
}
