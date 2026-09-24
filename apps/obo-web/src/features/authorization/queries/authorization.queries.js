import { useQuery } from '@tanstack/react-query'
import { authorizationApi } from '../api/authorization.api'

export const authorizationRolesQueryKey = ['authorization', 'roles']
export const authorizationModulesQueryKey = ['authorization', 'modules']

export function useAuthorizationRoles(options = {}) {
  return useQuery({
    queryKey: authorizationRolesQueryKey,
    queryFn: authorizationApi.listRoles,
    ...options,
  })
}

export function useAuthorizationModules(options = {}) {
  return useQuery({
    queryKey: authorizationModulesQueryKey,
    queryFn: authorizationApi.listModules,
    ...options,
  })
}
