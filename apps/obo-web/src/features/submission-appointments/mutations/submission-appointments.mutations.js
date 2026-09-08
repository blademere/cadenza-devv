import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionAppointmentsApi } from '../api/submission-appointments.api'
import {
  planPermitApplicationQueryKey,
  planPermitApplicationsQueryKey,
} from '../../plan-permits/queries/plan-permits.queries'
import { submissionAppointmentQueryKey } from '../queries/submission-appointments.queries'

const unwrap = (value) => value?.data ?? value

export function useScheduleSubmissionAppointment(applicationId, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => submissionAppointmentsApi.createApplicationAppointment(applicationId, data),
    ...options,
    onSuccess: async (data, variables, context) => {
      const appointment = unwrap(data)

      if (appointment) {
        queryClient.setQueryData(submissionAppointmentQueryKey(applicationId), appointment)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionAppointmentQueryKey(applicationId) }),
        queryClient.invalidateQueries({ queryKey: planPermitApplicationQueryKey(applicationId) }),
        queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey }),
      ])
      await options.onSuccess?.(data, variables, context)
    },
  })
}
