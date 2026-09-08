import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '../api/appointments.api'

const invalidateAppointments = async (queryClient) => {
  await queryClient.invalidateQueries({ queryKey: ['appointments'] })
}

const createMutation = (mutationFn, options = {}) => {
  return ({ queryClient, ...rest } = {}) => ({
    mutationFn,
    ...rest,
    onSuccess: async (data, variables, context) => {
      await invalidateAppointments(queryClient)
      await options.onSuccess?.(data, variables, context)
    },
  })
}

export function useCreateAppointmentType(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.createType, options)({ queryClient, ...options }))
}

export function useCreateAppointmentSchedule(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.createSchedule, options)({ queryClient, ...options }))
}

export function useCreateAppointmentSlot(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.createSlot, options)({ queryClient, ...options }))
}

export function useGenerateAppointmentSlots(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.generateSlots, options)({ queryClient, ...options }))
}

export function useCancelAppointment(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.cancel, options)({ queryClient, ...options }))
}

export function useCheckInAppointment(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.checkIn, options)({ queryClient, ...options }))
}

export function useNoShowAppointment(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.noShow, options)({ queryClient, ...options }))
}

export function useCompleteAppointment(options = {}) {
  const queryClient = useQueryClient()
  return useMutation(createMutation(appointmentsApi.complete, options)({ queryClient, ...options }))
}
