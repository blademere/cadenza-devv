import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authorizationApi } from '../api/authorization.api'
import {
  authorizationModulesQueryKey,
  authorizationRolesQueryKey,
} from '../queries/authorization.queries'
import { AUTHORIZATION_QUERY_KEY } from '../components/AuthorizationProvider'

export function useReplaceRolePermissions(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ roleId, permissionIds }) => authorizationApi.replaceRolePermissions(roleId, permissionIds),
    ...options,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authorizationRolesQueryKey }),
        queryClient.invalidateQueries({ queryKey: authorizationModulesQueryKey }),
        queryClient.invalidateQueries({ queryKey: AUTHORIZATION_QUERY_KEY }),
      ])
      await options.onSuccess?.(data, variables, context)
    },
  })
}
