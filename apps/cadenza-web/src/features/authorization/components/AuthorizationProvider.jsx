import {createContext,useContext,useMemo} from 'react'
const C=createContext({context:null,isLoading:false,error:null,can:()=>true})
export function AuthorizationProvider({children}){const value=useMemo(()=>({context:null,isLoading:false,error:null,can:()=>true}),[]);return <C.Provider value={value}>{children}</C.Provider>}
export function useAuthorization(){return useContext(C)}
