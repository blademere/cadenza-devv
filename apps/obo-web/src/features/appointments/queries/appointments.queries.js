import { useQuery } from '@tanstack/react-query'
import { appointmentsApi } from '../api/appointments.api'

export const appointmentManagementTypesQueryKey = ['appointments', 'management', 'types']
export const appointmentManagementSchedulesQueryKey = ({ appointmentTypeId, active } = {}) => [
  'appointments',
  'management',
  'schedules',
  { appointmentTypeId, active },
]
export const appointmentManagementSlotsQueryKey = ({ appointmentTypeId, from, to, status } = {}) => [
  'appointments',
  'management',
  'slots',
  { appointmentTypeId, from, to, status },
]
export const appointmentManagementQueryKey = ({ appointmentTypeId, status, from, to } = {}) => [
  'appointments',
  'management',
  'appointments',
  { appointmentTypeId, status, from, to },
]

export function useAppointmentManagementTypes(options = {}) {
  return useQuery({
    queryKey: appointmentManagementTypesQueryKey,
    queryFn: appointmentsApi.listTypes,
    ...options,
  })
}

export function useAppointmentManagementSchedules(params = {}, options = {}) {
  return useQuery({
    queryKey: appointmentManagementSchedulesQueryKey(params),
    queryFn: () => appointmentsApi.listSchedules(params),
    enabled: options.enabled !== false,
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

export function useAppointmentManagement(options = {}) {
  const params = options.params ?? {}
  const queryOptions = { ...options }
  delete queryOptions.params
  return useQuery({
    queryKey: appointmentManagementQueryKey(params),
    queryFn: () => appointmentsApi.listManagement(params),
    enabled: queryOptions.enabled !== false,
    ...queryOptions,
  })
}

export function useAppointmentManagementMine(options = {}) {
  return useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: appointmentsApi.listMine,
    ...options,
  })
}
