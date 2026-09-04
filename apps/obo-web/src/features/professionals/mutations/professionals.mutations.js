import { useMutation, useQueryClient } from '@tanstack/react-query'
import { professionalsApi } from '../api/professionals.api'

import {
  pendingProfessionalsQueryKey,
  professionalMineQueryKey,
  verifiedProfessionalsQueryKey,
} from '../queries/professionals.queries'

export function useApplyProfessionalVerification(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => professionalsApi.applyVerification(data),
    ...options,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: professionalMineQueryKey }),
        queryClient.invalidateQueries({ queryKey: pendingProfessionalsQueryKey }),
      ])
      await options.onSuccess?.(data, variables, context)
    },
  })
}

export function useDecideProfessionalVerification(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, decision, reason }) => professionalsApi.decideVerification(id, decision, reason),
    ...options,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pendingProfessionalsQueryKey }),
        queryClient.invalidateQueries({ queryKey: verifiedProfessionalsQueryKey }),
        queryClient.invalidateQueries({ queryKey: professionalMineQueryKey }),
      ])
      await options.onSuccess?.(data, variables, context)
    },
  })
}
