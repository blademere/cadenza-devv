import { useQuery } from '@tanstack/react-query'
import { receivingApi } from '../api/receiving.api'

export const receivingApplicationsQueryKey = (status = 'SUBMISSION_SCHEDULED') => ['obo', 'receiving', 'applications', status]
export const receivingApplicationQueryKey = (applicationId) => ['obo', 'receiving', 'applications', applicationId]
export const receivingDocumentChecklistQueryKey = (applicationId) => ['obo', 'receiving', 'applications', applicationId, 'documents']

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

export function useReceivingDocumentChecklist(applicationId, options = {}) {
  return useQuery({ queryKey: receivingDocumentChecklistQueryKey(applicationId), queryFn: () => receivingApi.getDocumentChecklist(applicationId), enabled: Boolean(applicationId) && options.enabled !== false, ...options })
}
