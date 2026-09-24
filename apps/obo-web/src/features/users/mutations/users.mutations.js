import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import { usersQueryKey } from '../queries/users.queries'
import { AUTHORIZATION_QUERY_KEY } from '../../authorization/components/AuthorizationProvider'

export function useAssignUserRole(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId }) => usersApi.assignRole(userId, roleId),
    ...options,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKey }),
        queryClient.invalidateQueries({ queryKey: AUTHORIZATION_QUERY_KEY }),
      ])
      await options.onSuccess?.(data, variables, context)
    },
  })
}
