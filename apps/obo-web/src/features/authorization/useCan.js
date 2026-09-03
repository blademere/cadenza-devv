import { useCallback } from 'react'
import { useAuthorization } from './AuthorizationProvider'

export function useCan() {
  const { can } = useAuthorization()
  return useCallback((permission) => can(permission), [can])
}
