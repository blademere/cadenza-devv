import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from './users.api'

export const usersQueryKey = ['users']

export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: usersApi.listUsers,
  })
}

export function useAssignUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId }) => usersApi.assignRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  })
}
