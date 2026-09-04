import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { receivingApi } from './receiving.api'
import { planPermitApplicationQueryKey, planPermitApplicationsQueryKey } from '../plan-permits/queries/plan-permits.queries'

export const receivingApplicationsQueryKey = (status = 'SUBMISSION_SCHEDULED') => ['obo', 'receiving', 'applications', status]
export const receivingApplicationQueryKey = (applicationId) => ['obo', 'receiving', 'applications', applicationId]

export function useReceivingApplications(status = 'SUBMISSION_SCHEDULED', options = {}) {
  return useQuery({ queryKey: receivingApplicationsQueryKey(status), queryFn: () => receivingApi.listApplications(status), ...options })
}

export function useReceivingApplication(applicationId, options = {}) {
  return useQuery({
    queryKey: receivingApplicationQueryKey(applicationId),
    queryFn: () => receivingApi.getApplication(applicationId),
    enabled: Boolean(applicationId) && options.enabled !== false,
    ...options,
  })
}

function useReceivingMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ['obo', 'receiving', 'applications'] })
      if (variables?.applicationId) {
        await queryClient.invalidateQueries({ queryKey: receivingApplicationQueryKey(variables.applicationId) })
        await queryClient.invalidateQueries({ queryKey: planPermitApplicationQueryKey(variables.applicationId) })
        await queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      }
      await options.onSuccess?.(data, variables, context)
    },
  })
}

export function useReceiveApplication(options = {}) {
  return useReceivingMutation(({ applicationId }) => receivingApi.receiveApplication(applicationId), options)
}

export function useDecideReceivingApplication(options = {}) {
  return useReceivingMutation(({ applicationId, decision, reason }) => receivingApi.decideApplication(applicationId, decision, reason), options)
}
