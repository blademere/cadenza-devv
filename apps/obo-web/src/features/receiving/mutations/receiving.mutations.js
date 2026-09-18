import { useMutation, useQueryClient } from '@tanstack/react-query'
import { receivingApi } from '../api/receiving.api'
import { applicationQueryKey, applicationsQueryKey } from '../../applications/queries/applications.queries'
import { receivingApplicationQueryKey, receivingDocumentChecklistQueryKey } from '../queries/receiving.queries'

function useReceivingMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ['obo', 'receiving', 'applications'] })
      if (variables?.applicationId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: receivingApplicationQueryKey(variables.applicationId) }),
          queryClient.invalidateQueries({ queryKey: receivingDocumentChecklistQueryKey(variables.applicationId) }),
          queryClient.invalidateQueries({ queryKey: applicationQueryKey(variables.applicationId) }),
          queryClient.invalidateQueries({ queryKey: applicationsQueryKey }),
        ])
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

export function useUpdateDocumentReceipt(options = {}) {
  return useReceivingMutation(
    ({ applicationId, requirementId, status, notes }) => receivingApi.updateDocumentReceipt(applicationId, requirementId, status, notes),
    options,
  )
}
