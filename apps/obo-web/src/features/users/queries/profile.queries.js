import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export const myProfileQueryKey = ['users', 'me', 'profile']

export function useMyProfile(options = {}) {
  return useQuery({
    queryKey: myProfileQueryKey,
    queryFn: usersApi.getMyProfile,
    ...options,
  })
}
