import { useQuery } from '@tanstack/react-query'
import { receivingApi } from './receiving.api'

export const receivingApplicationsQueryKey = ['obo', 'receiving', 'applications']

export function useReceivingApplications(options = {}) {
  return useQuery({
    queryKey: receivingApplicationsQueryKey,
    queryFn: () => receivingApi.listApplications(),
    ...options,
  })
}
