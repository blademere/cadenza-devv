import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import { myProfileQueryKey } from '../queries/profile.queries'

export function useUpdateMyProfile(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.updateMyProfile,
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey })
      await options.onSuccess?.(data, variables, context)
    },
  })
}
