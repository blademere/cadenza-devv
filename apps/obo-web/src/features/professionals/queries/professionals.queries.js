import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { professionalsApi } from '../api/professionals.api'

export const verifiedProfessionalsQueryKey = ['obo', 'professionals', 'verified']
export const pendingProfessionalsQueryKey = ['obo', 'professionals', 'pending']
export const professionalMineQueryKey = ['obo', 'professionals', 'mine']

export function useVerifiedProfessionals(options = {}) {
  return useQuery({
    queryKey: verifiedProfessionalsQueryKey,
    queryFn: professionalsApi.listVerified,
    ...options,
  })
}

export function usePendingProfessionals(options = {}) {
  return useQuery({
    queryKey: pendingProfessionalsQueryKey,
    queryFn: professionalsApi.listPendingVerification,
    ...options,
  })
}

export function useMyProfessional(options = {}) {
  return useQuery({
    queryKey: professionalMineQueryKey,
    queryFn: professionalsApi.getMine,
    ...options,
  })
}

export function useDecideProfessionalVerification(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, decision, reason }) => professionalsApi.decideVerification(id, decision, reason),
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: pendingProfessionalsQueryKey })
      await queryClient.invalidateQueries({ queryKey: verifiedProfessionalsQueryKey })
      await queryClient.invalidateQueries({ queryKey: professionalMineQueryKey })
      await options.onSuccess?.(data, variables, context)
    },
  })
}
