import {createContext,useContext,useEffect,useState} from 'react';
import {authSession,portalRequest} from '../auth/api.js';
export const AdminContext=createContext(null);
export const useAdmin=()=>useContext(AdminContext);
export function csvDownload(name,headings,rows){const csv=[headings,...rows].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function AdminProvider({children}){const [snapshot,setSnapshot]=useState(null),[user,setUser]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[modal,setModal]=useState(null),[search,setSearch]=useState('');
 async function refresh(){const s=await authSession();setUser(s.user);if(s.user?.role==='admin')setSnapshot(await portalRequest('admin/overview'));}
 useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function action(kind,data){setBusy(true);setError('');setNotice('');try{const result=await portalRequest('admin/'+kind,data);setSnapshot(result);setNotice('Changes saved successfully.');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false)}}
 return <AdminContext.Provider value={{snapshot,user,loading,busy,error,setError,notice,setNotice,modal,setModal,search,setSearch,refresh,action}}>{children}</AdminContext.Provider>;
}
