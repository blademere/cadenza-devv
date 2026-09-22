const API_BASE_URL=import.meta.env.VITE_API_BASE_URL??'/api/v1'
let accessToken=null,csrfToken=null,refreshHandler=null
const request=async(path,options={},retry=true)=>{
  const {skipRefresh=false,...fetchOptions}=options
  const method=fetchOptions.method??'GET'
  const headers=new Headers(fetchOptions.headers)
  if(fetchOptions.body!==undefined&&!headers.has('Content-Type'))headers.set('Content-Type','application/json')
  if(accessToken)headers.set('Authorization','Bearer '+accessToken)
  if(['POST','PUT','PATCH','DELETE'].includes(method)&&csrfToken)headers.set('x-csrf-token',csrfToken)
  const response=await fetch(API_BASE_URL+path,{...fetchOptions,method,headers,credentials:'include'})
  let data=null
  try{data=response.status===204?null:await response.json()}catch{}
  if(!response.ok){
    if(response.status===401&&retry&&!skipRefresh&&refreshHandler){
      if(await refreshHandler())return request(path,options,false)
    }
    const e=new Error(data?.message||'API request failed')
    e.status=response.status
    throw e
  }
  return data
}
export const apiClient={
  setAccessToken:t=>{accessToken=t??null},
  clearAccessToken:()=>{accessToken=null;csrfToken=null},
  setCsrfToken:t=>{csrfToken=t??null},
  setRefreshHandler:h=>{refreshHandler=h},
  get:(p,o)=>request(p,{...o,method:'GET'}),
  post:(p,b,o={})=>request(p,{...o,method:'POST',headers:{'Idempotency-Key':crypto.randomUUID(),...(o.headers||{})},body:JSON.stringify(b)}),
  put:(p,b,o={})=>request(p,{...o,method:'PUT',body:JSON.stringify(b)}),
  patch:(p,b,o={})=>request(p,{...o,method:'PATCH',body:JSON.stringify(b)}),
  delete:(p,o={})=>request(p,{...o,method:'DELETE'})
}
