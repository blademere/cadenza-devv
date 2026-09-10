import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planPermitsApi } from '../api/plan-permits.api'

export const planPermitApplicationsQueryKey = ['obo', 'plan-permits', 'applications']
export const planPermitApplicationQueryKey = (id) => ['obo', 'plan-permits', 'applications', id]
export const permitTypesQueryKey = ['obo', 'plan-permits', 'permit-types']
export const permitTypeQueryKey = (id) => ['obo', 'plan-permits', 'permit-types', id]
export const permitTypeFormQueryKey = (id, version) => ['obo', 'plan-permits', 'permit-types', id, 'form', version ?? 'latest']
export const permitTypeFormVersionQueryKey = (id, version) => ['obo', 'plan-permits', 'permit-types', id, 'form-version', version]

export function usePlanPermitApplications(options = {}) {
  return useQuery({ queryKey: planPermitApplicationsQueryKey, queryFn: planPermitsApi.listApplications, ...options })
}

export function usePlanPermitApplication(id, options = {}) {
  return useQuery({ queryKey: planPermitApplicationQueryKey(id), queryFn: () => planPermitsApi.getApplication(id), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypes(options = {}) {
  return useQuery({ queryKey: permitTypesQueryKey, queryFn: planPermitsApi.listPermitTypes, ...options })
}

export function usePermitType(id, options = {}) {
  return useQuery({ queryKey: permitTypeQueryKey(id), queryFn: () => planPermitsApi.getPermitType(id), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypeForm(id, version, options = {}) {
  return useQuery({ queryKey: permitTypeFormQueryKey(id, version), queryFn: () => planPermitsApi.getPermitTypeForm(id, version), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypeFormVersion(id, version, options = {}) {
  return useQuery({ queryKey: permitTypeFormVersionQueryKey(id, version), queryFn: () => planPermitsApi.getPermitTypeFormVersion(id, version), enabled: Boolean(id && version) && options.enabled !== false, ...options })
}

export function useCreatePermitType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: planPermitsApi.createPermitType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: permitTypesQueryKey }),
  })
}

export function useUpdatePermitType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => planPermitsApi.updatePermitType(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: permitTypesQueryKey }),
  })
}

export function useCreatePermitTypeForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => planPermitsApi.createPermitTypeForm(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: permitTypesQueryKey })
      queryClient.invalidateQueries({ queryKey: permitTypeQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
    },
  })
}

export function useCreatePermitTypeFormVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => planPermitsApi.createPermitTypeFormVersion(id, data),
    onSuccess: (version, variables) => {
      queryClient.setQueryData(permitTypeFormVersionQueryKey(variables.id, version?.version), version)
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
    },
  })
}

export function useUpdatePermitTypeFormVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version, ...data }) => planPermitsApi.updatePermitTypeFormVersion(id, version, data),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(permitTypeFormVersionQueryKey(variables.id, variables.version), updated)
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
    },
  })
}

export function usePublishPermitTypeFormVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }) => planPermitsApi.publishPermitTypeFormVersion(id, version),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: permitTypesQueryKey })
      queryClient.invalidateQueries({ queryKey: permitTypeQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormVersionQueryKey(variables.id, variables.version) })
    },
  })
}

export function useCreatePlanPermitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: planPermitsApi.createApplication,
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      if (application?.id) queryClient.setQueryData(planPermitApplicationQueryKey(application.id), application)
    },
  })
}

export function useUpdatePlanPermitDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => planPermitsApi.updateDraft(id, data),
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      if (application?.id) queryClient.setQueryData(planPermitApplicationQueryKey(application.id), application)
    },
  })
}

export function useSubmitPlanPermitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: planPermitsApi.submitApplication,
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: planPermitApplicationsQueryKey })
      if (application?.id) queryClient.setQueryData(planPermitApplicationQueryKey(application.id), application)
    },
  })
}
