import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { receivingApi } from '../api/receiving.api'
import { planPermitApplicationQueryKey, planPermitApplicationsQueryKey } from '../../plan-permits/queries/plan-permits.queries'

export const receivingApplicationsQueryKey = (status = 'SUBMISSION_SCHEDULED') => ['obo', 'receiving', 'applications', status]
export const receivingApplicationQueryKey = (applicationId) => ['obo', 'receiving', 'applications', applicationId]

function normalizeStatus(status) {
  if (status === undefined || status === null || status === '') return 'SUBMISSION_SCHEDULED'
  if (typeof status === 'string') return status
  if (typeof status === 'object' && typeof status.status === 'string') return status.status
  throw new TypeError('Receiving application status must be a string')
}

export function useReceivingApplications(status = 'SUBMISSION_SCHEDULED', options = {}) {
  const normalizedStatus = normalizeStatus(status)
  return useQuery({
    queryKey: receivingApplicationsQueryKey(normalizedStatus),
    queryFn: () => receivingApi.listApplications(normalizedStatus),
    ...options,
  })
}

export function useReceivingApplication(applicationId, options = {}) {
  return useQuery({ queryKey: receivingApplicationQueryKey(applicationId), queryFn: () => receivingApi.getApplication(applicationId), enabled: Boolean(applicationId) && options.enabled !== false, ...options })
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
