import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '../api/applications.api'

export const applicationsQueryKey = ['obo', 'applications', 'applications']
export const applicationQueryKey = (id) => ['obo', 'applications', 'applications', id]
export const permitTypesQueryKey = ['obo', 'applications', 'permit-types']
export const permitTypeQueryKey = (id) => ['obo', 'applications', 'permit-types', id]
export const permitTypeFormVersionsQueryKey = (id) => ['obo', 'applications', 'permit-types', id, 'form-versions']
export const permitTypeFormQueryKey = (id, version) => ['obo', 'applications', 'permit-types', id, 'form', version ?? 'latest']
export const permitTypeFormVersionQueryKey = (id, version) => ['obo', 'applications', 'permit-types', id, 'form-version', version]

export function useApplications(options = {}) {
  return useQuery({ queryKey: applicationsQueryKey, queryFn: applicationsApi.listApplications, ...options })
}

export function useApplication(id, options = {}) {
  return useQuery({ queryKey: applicationQueryKey(id), queryFn: () => applicationsApi.getApplication(id), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypes(options = {}) {
  return useQuery({ queryKey: permitTypesQueryKey, queryFn: applicationsApi.listPermitTypes, ...options })
}

export function usePermitType(id, options = {}) {
  return useQuery({ queryKey: permitTypeQueryKey(id), queryFn: () => applicationsApi.getPermitType(id), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypeFormVersions(id, options = {}) {
  return useQuery({ queryKey: permitTypeFormVersionsQueryKey(id), queryFn: () => applicationsApi.getPermitTypeFormVersions(id), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypeForm(id, version, options = {}) {
  return useQuery({ queryKey: permitTypeFormQueryKey(id, version), queryFn: () => applicationsApi.getPermitTypeForm(id, version), enabled: Boolean(id) && options.enabled !== false, ...options })
}

export function usePermitTypeFormVersion(id, version, options = {}) {
  return useQuery({ queryKey: permitTypeFormVersionQueryKey(id, version), queryFn: () => applicationsApi.getPermitTypeFormVersion(id, version), enabled: Boolean(id && version) && options.enabled !== false, ...options })
}

export function useCreatePermitType() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: applicationsApi.createPermitType, onSuccess: () => queryClient.invalidateQueries({ queryKey: permitTypesQueryKey }) })
}

export function useUpdatePermitType() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...data }) => applicationsApi.updatePermitType(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: permitTypesQueryKey }) })
}

export function useCreatePermitTypeForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => applicationsApi.createPermitTypeForm(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: permitTypesQueryKey })
      queryClient.invalidateQueries({ queryKey: permitTypeQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormVersionsQueryKey(variables.id) })
    },
  })
}

export function useCreatePermitTypeFormVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => applicationsApi.createPermitTypeFormVersion(id, data),
    onSuccess: (version, variables) => {
      queryClient.setQueryData(permitTypeFormVersionQueryKey(variables.id, version?.version), version)
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormVersionsQueryKey(variables.id) })
    },
  })
}

export function useUpdatePermitTypeFormVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version, ...data }) => applicationsApi.updatePermitTypeFormVersion(id, version, data),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(permitTypeFormVersionQueryKey(variables.id, variables.version), updated)
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id, variables.version) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormVersionsQueryKey(variables.id) })
    },
  })
}

export function usePublishPermitTypeFormVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }) => applicationsApi.publishPermitTypeFormVersion(id, version),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: permitTypesQueryKey })
      queryClient.invalidateQueries({ queryKey: permitTypeQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormQueryKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormVersionQueryKey(variables.id, variables.version) })
      queryClient.invalidateQueries({ queryKey: permitTypeFormVersionsQueryKey(variables.id) })
    },
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applicationsApi.createApplication,
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
      if (application?.id) queryClient.setQueryData(applicationQueryKey(application.id), application)
    },
  })
}

export function useUpdateApplicationDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => applicationsApi.updateDraft(id, data),
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
      if (application?.id) queryClient.setQueryData(applicationQueryKey(application.id), application)
    },
  })
}

export function useSubmitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applicationsApi.submitApplication,
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
      if (application?.id) queryClient.setQueryData(applicationQueryKey(application.id), application)
    },
  })
}
