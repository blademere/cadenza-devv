import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionAppointmentsApi } from '../api/submission-appointments.api'
import {
  planPermitApplicationQueryKey,
  planPermitApplicationsQueryKey,
} from '../../plan-permits/queries/plan-permits.queries'
import { submissionAppointmentQueryKey } from '../queries/submission-appointments.queries'

export function useScheduleSubmissionAppointment(applicationId, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => submissionAppointmentsApi.createApplicationAppointment(applicationId, data),
    ...options,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionAppointmentQueryKey(applicationId) }),
        queryClient.invalidateQueries({ queryKey: planPermitApplicationQueryKey(applicationId) }),
        queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey }),
      ])
      await options.onSuccess?.(data, variables, context)
    },
  })
}
