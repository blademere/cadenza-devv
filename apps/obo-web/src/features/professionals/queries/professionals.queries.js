import { useQuery } from '@tanstack/react-query'
import { professionalsApi } from '../api/professionals.api'

export const verifiedProfessionalsQueryKey = ['obo', 'professionals', 'verified']
export const pendingProfessionalsQueryKey = ['obo', 'professionals', 'pending']
export const professionalMineQueryKey = ['obo', 'professionals', 'mine']

export function useVerifiedProfessionals(options = {}) {
  return useQuery({
    ...options,
    queryKey: verifiedProfessionalsQueryKey,
    queryFn: () => professionalsApi.listVerified(),
  })
}

export function usePendingProfessionals(options = {}) {
  return useQuery({
    ...options,
    queryKey: pendingProfessionalsQueryKey,
    queryFn: () => professionalsApi.listPendingVerification(),
  })
}

export function useMyProfessional(options = {}) {
  return useQuery({
    ...options,
    queryKey: professionalMineQueryKey,
    queryFn: () => professionalsApi.getApplication(),
  })
}
