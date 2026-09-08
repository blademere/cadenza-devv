import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '../api/appointments.api'
import { appointmentManagementSlotsQueryKey } from '../queries/appointments.queries'

export function useCreateAppointmentSlot(options = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: appointmentsApi.createSlot,
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ['appointments', 'management', 'slots'] })
      await options.onSuccess?.(data, variables, context)
    },
  })
}
