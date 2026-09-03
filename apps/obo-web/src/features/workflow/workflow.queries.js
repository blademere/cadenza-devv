import { useQuery } from '@tanstack/react-query'
import { workflowApi } from './workflow.api'

export const receivingApplicationsQueryKey = ['obo', 'receiving', 'applications']
export const pendingProfessionalsQueryKey = ['obo', 'professionals', 'pending']

export function useReceivingApplications(options = {}) {
  return useQuery({
    queryKey: receivingApplicationsQueryKey,
    queryFn: () => workflowApi.listReceiving(),
    ...options,
  })
}

export function usePendingProfessionals(options = {}) {
  return useQuery({
    queryKey: pendingProfessionalsQueryKey,
    queryFn: workflowApi.listPendingProfessionals,
    ...options,
  })
}
