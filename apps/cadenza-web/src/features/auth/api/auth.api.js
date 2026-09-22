import {apiClient} from '../../../services/api/client'
const A='/auth'
export const authApi={
  async csrf(){const r=await apiClient.get(A+'/csrf');apiClient.setCsrfToken(r.data.csrfToken);return r.data},
  async login(c){const r=await apiClient.post(A+'/login',c,{skipRefresh:true});if(r.data.csrfToken)apiClient.setCsrfToken(r.data.csrfToken);return r.data},
  async refresh(){return (await apiClient.post(A+'/refresh',null,{skipRefresh:true})).data},
  async me(){return (await apiClient.get(A+'/me')).data},
  async logout(){await apiClient.post(A+'/logout',null,{skipRefresh:true})}
}
export const getOAuthLoginUrl=p=>(import.meta.env.VITE_API_BASE_URL??'/api/v1').replace(/\/$/,'')+A+'/oauth/'+p
