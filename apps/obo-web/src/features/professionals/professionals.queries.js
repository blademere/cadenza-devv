import { useQuery } from '@tanstack/react-query'
import { professionalsApi } from './professionals.api'

export const pendingProfessionalsQueryKey = ['obo', 'professionals', 'pending']

export function usePendingProfessionals(options = {}) {
  return useQuery({
    queryKey: pendingProfessionalsQueryKey,
    queryFn: professionalsApi.listPendingVerification,
    ...options,
  })
}
