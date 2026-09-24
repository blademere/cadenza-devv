import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionAppointmentsApi } from '../api/submission-appointments.api'
import {
  applicationQueryKey,
  applicationsQueryKey,
} from '../../applications/queries/applications.queries'
import { submissionAppointmentQueryKey } from '../queries/submission-appointments.queries'

const invalidate = async (queryClient, applicationId) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: submissionAppointmentQueryKey(applicationId), refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: applicationQueryKey(applicationId), refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: applicationsQueryKey, refetchType: 'active' }),
  ])
}

export function useScheduleSubmissionAppointment(applicationId, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => submissionAppointmentsApi.createApplicationAppointment(applicationId, data),
    ...options,
    onSuccess: async (data, variables, context) => {
      // Do not seed the appointment query from the POST response. The GET endpoint is
      // the authoritative persisted state and must confirm that the appointment exists.
      await invalidate(queryClient, applicationId)
      await options.onSuccess?.(data, variables, context)
    },
  })
}

export function useRescheduleSubmissionAppointment(applicationId, options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => submissionAppointmentsApi.replaceApplicationAppointment(applicationId, data),
    ...options,
    onSuccess: async (data, variables, context) => {
      await invalidate(queryClient, applicationId)
      await options.onSuccess?.(data, variables, context)
    },
  })
}
