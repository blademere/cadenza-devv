import { useQuery } from '@tanstack/react-query'
import { authorizationApi } from './authorization.api'

export const authorizationRolesQueryKey = ['authorization', 'roles']
export const authorizationModulesQueryKey = ['authorization', 'modules']

export function useAuthorizationRoles() {
  return useQuery({
    queryKey: authorizationRolesQueryKey,
    queryFn: authorizationApi.listRoles,
  })
}

export function useAuthorizationModules() {
  return useQuery({
    queryKey: authorizationModulesQueryKey,
    queryFn: authorizationApi.listModules,
  })
}
