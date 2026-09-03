import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { submissionAppointmentsApi } from '../api/submission-appointments.api'
import {
  planPermitApplicationQueryKey,
  planPermitApplicationsQueryKey,
} from '../../plan-permits/queries/plan-permits.queries'

export const submissionAppointmentQueryKey = (applicationId) => [
  'obo',
  'submission-appointments',
  applicationId,
]

export function useSubmissionAppointment(applicationId, options = {}) {
  return useQuery({
    queryKey: submissionAppointmentQueryKey(applicationId),
    queryFn: () => submissionAppointmentsApi.getApplicationAppointment(applicationId),
    enabled: Boolean(applicationId) && options.enabled !== false,
    ...options,
  })
}

export function useScheduleSubmissionAppointment(applicationId, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => submissionAppointmentsApi.createApplicationAppointment(applicationId, data),
    ...options,
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionAppointmentQueryKey(applicationId) }),
        queryClient.invalidateQueries({ queryKey: planPermitApplicationQueryKey(applicationId) }),
        queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey }),
      ])
      await options.onSuccess?.(...args)
    },
  })
}
