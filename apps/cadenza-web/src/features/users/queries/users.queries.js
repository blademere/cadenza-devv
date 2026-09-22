import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export const usersQueryKey = ['obo', 'users']

export function useUsers(options = {}) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: usersApi.listUsers,
    ...options,
  })
}
