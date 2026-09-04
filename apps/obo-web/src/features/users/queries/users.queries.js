import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export const usersQueryKey = ['users']

export function useUsers(options = {}) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: usersApi.listUsers,
    ...options,
  })
}

export function useAssignUserRole(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId }) => usersApi.assignRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
    ...options,
  })
}
