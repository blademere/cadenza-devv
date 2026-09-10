import { useQuery } from '@tanstack/react-query'
import { professionalsApi } from '../api/professionals.api'

export const verifiedProfessionalsQueryKey = ['obo', 'professionals', 'verified']
export const pendingProfessionalsQueryKey = ['obo', 'professionals', 'pending']
export const professionalMineQueryKey = ['obo', 'professional-applications', 'mine']

export function useVerifiedProfessionals(options = {}) {
  const { filters = {}, ...queryOptions } = options
  return useQuery({
    ...queryOptions,
    queryKey: [...verifiedProfessionalsQueryKey, filters],
    queryFn: () => professionalsApi.listDirectory({ status: 'VERIFIED', ...filters }),
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
