import { apiClient } from '../../services/api/client'

const AUTH_PATH = '/auth'

export const authApi = {
  async login(credentials) {
    const response = await apiClient.post(`${AUTH_PATH}/login`, credentials)
    return response.data
  },

  async refresh() {
    const response = await apiClient.post(`${AUTH_PATH}/refresh`)
    return response.data
  },

  async me() {
    const response = await apiClient.get(`${AUTH_PATH}/me`)
    return response.data
  },

  async logout() {
    await apiClient.post(`${AUTH_PATH}/logout`)
  },

  async oauthAccounts() {
    const response = await apiClient.get(`${AUTH_PATH}/oauth/accounts`)
    return response.data
  },

  async unlinkOAuthAccount(provider) {
    const response = await apiClient.delete(`${AUTH_PATH}/oauth/link/${provider}`)
    return response.data
  },
}

export const getOAuthLoginUrl = (provider) => {
  if (!['google', 'facebook'].includes(provider)) {
    throw new Error('Unsupported OAuth provider.')
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
  return `${apiBaseUrl.replace(/\/$/, '')}${AUTH_PATH}/oauth/${provider}`
}

export const getOAuthLinkUrl = (provider) => {
  if (!['google', 'facebook'].includes(provider)) {
    throw new Error('Unsupported OAuth provider.')
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
  return `${apiBaseUrl.replace(/\/$/, '')}${AUTH_PATH}/oauth/link/${provider}`
}
