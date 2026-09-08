import { useQuery } from '@tanstack/react-query'
import { appointmentsApi } from '../api/appointments.api'

export const appointmentManagementTypesQueryKey = ['appointments', 'management', 'types']
export const appointmentManagementSlotsQueryKey = ({ appointmentTypeId, from, to, status } = {}) => [
  'appointments',
  'management',
  'slots',
  { appointmentTypeId, from, to, status },
]
export const appointmentManagementMineQueryKey = ['appointments', 'management', 'mine']

export function useAppointmentManagementTypes(options = {}) {
  return useQuery({
    queryKey: appointmentManagementTypesQueryKey,
    queryFn: appointmentsApi.listTypes,
    ...options,
  })
}

export function useAppointmentManagementSlots(params = {}, options = {}) {
  return useQuery({
    queryKey: appointmentManagementSlotsQueryKey(params),
    queryFn: () => appointmentsApi.listSlots(params),
    enabled: options.enabled !== false,
    ...options,
  })
}

export function useAppointmentManagementMine(options = {}) {
  return useQuery({
    queryKey: appointmentManagementMineQueryKey,
    queryFn: appointmentsApi.listMine,
    ...options,
  })
}
