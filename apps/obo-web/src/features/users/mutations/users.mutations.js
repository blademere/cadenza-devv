import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import { usersQueryKey } from '../queries/users.queries'

export function useAssignUserRole(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId }) => usersApi.assignRole(userId, roleId),
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
      await options.onSuccess?.(data, variables, context)
    },
  })
}
