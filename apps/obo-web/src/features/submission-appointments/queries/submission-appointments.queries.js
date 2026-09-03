import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { submissionAppointmentsApi } from '../api/submission-appointments.api'
import { planPermitApplicationQueryKey, planPermitApplicationsQueryKey } from '../../plan-permits/queries/plan-permits.queries'

export const submissionAppointmentQueryKey = (applicationId) => ['obo', 'submission-appointments', applicationId]
export const appointmentTypesQueryKey = ['appointments', 'types']
export const appointmentSlotsQueryKey = ({ appointmentTypeId, from, to } = {}) => [
  'appointments',
  'slots',
  { appointmentTypeId, from, to },
]
export const myAppointmentsQueryKey = ['appointments', 'mine']

export function useSubmissionAppointment(applicationId, options = {}) {
  return useQuery({
    queryKey: submissionAppointmentQueryKey(applicationId),
    queryFn: () => submissionAppointmentsApi.getApplicationAppointment(applicationId),
    enabled: Boolean(applicationId) && options.enabled !== false,
    ...options,
  })
}

export function useAppointmentTypes(options = {}) {
  return useQuery({
    queryKey: appointmentTypesQueryKey,
    queryFn: submissionAppointmentsApi.listAppointmentTypes,
    ...options,
  })
}

export function useAvailableAppointmentSlots(params = {}, options = {}) {
  return useQuery({
    queryKey: appointmentSlotsQueryKey(params),
    queryFn: () => submissionAppointmentsApi.listAvailableSlots(params),
    enabled: Boolean(params.appointmentTypeId) && options.enabled !== false,
    ...options,
  })
}

export function useMyAppointments(options = {}) {
  return useQuery({
    queryKey: myAppointmentsQueryKey,
    queryFn: submissionAppointmentsApi.listMyAppointments,
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
        queryClient.invalidateQueries({ queryKey: myAppointmentsQueryKey }),
      ])
      await options.onSuccess?.(...args)
    },
  })
}
