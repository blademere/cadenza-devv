import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planPermitsApi } from '../api/plan-permits.api'

export const planPermitApplicationsQueryKey = ['obo', 'plan-permits', 'applications']
export const planPermitApplicationQueryKey = (id) => ['obo', 'plan-permits', 'applications', id]
export const permitTypesQueryKey = ['obo', 'plan-permits', 'permit-types']
export const permitTypeFormQueryKey = (id, version) => ['obo', 'plan-permits', 'permit-types', id, 'form', version ?? 'latest']

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

export function usePermitTypeForm(id, version, options = {}) {
  return useQuery({
    queryKey: permitTypeFormQueryKey(id, version),
    queryFn: () => planPermitsApi.getPermitTypeForm(id, version),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  })
}

export function useCreatePlanPermitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: planPermitsApi.createApplication,
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      if (application?.id) {
        queryClient.setQueryData(planPermitApplicationQueryKey(application.id), application)
      }
    },
  })
}

export function useUpdatePlanPermitDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => planPermitsApi.updateDraft(id, data),
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      if (application?.id) {
        queryClient.setQueryData(planPermitApplicationQueryKey(application.id), application)
      }
    },
  })
}

export function useSubmitPlanPermitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: planPermitsApi.submitApplication,
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      if (application?.id) {
        queryClient.setQueryData(planPermitApplicationQueryKey(application.id), application)
      }
    },
  })
}
