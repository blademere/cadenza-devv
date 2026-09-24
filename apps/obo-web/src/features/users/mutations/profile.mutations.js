import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import { myProfileQueryKey } from '../queries/profile.queries'

function useProfileMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey })
      await options.onSuccess?.(data, variables, context)
    },
  })
}

export function useCreateMyProfile(options = {}) {
  return useProfileMutation(usersApi.createMyProfile, options)
}

export function useUpdateMyProfile(options = {}) {
  return useProfileMutation(usersApi.updateMyProfile, options)
}
