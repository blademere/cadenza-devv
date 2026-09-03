import { useQuery } from '@tanstack/react-query'
import { planPermitsApi } from '../api/plan-permits.api'

export const planPermitApplicationsQueryKey = ['obo', 'plan-permits', 'applications']
export const planPermitApplicationQueryKey = (id) => ['obo', 'plan-permits', 'applications', id]
export const permitTypesQueryKey = ['obo', 'plan-permits', 'permit-types']
export const permitTypeFormQueryKey = (id) => ['obo', 'plan-permits', 'permit-types', id, 'form']

export function usePlanPermitApplications(options = {}) {
  return useQuery({
    queryKey: planPermitApplicationsQueryKey,
    queryFn: planPermitsApi.listApplications,
    ...options,
  })
}

export function usePlanPermitApplication(id, options = {}) {
  return useQuery({
    queryKey: planPermitApplicationQueryKey(id),
    queryFn: () => planPermitsApi.getApplication(id),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  })
}

export function usePermitTypes(options = {}) {
  return useQuery({
    queryKey: permitTypesQueryKey,
    queryFn: planPermitsApi.listPermitTypes,
    ...options,
  })
}

export function usePermitTypeForm(id, options = {}) {
  return useQuery({
    queryKey: permitTypeFormQueryKey(id),
    queryFn: () => planPermitsApi.getPermitTypeForm(id),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  })
}
