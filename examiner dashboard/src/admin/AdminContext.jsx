import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { adminReducer, restoreAdminState, STORAGE_KEY } from './adminState.js';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [state, dispatch] = useReducer(adminReducer, undefined, restoreAdminState);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageError(''); }
    catch { setStorageError('Changes could not be saved in this browser. Free browser storage before refreshing.'); }
  }, [state]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  return <AdminContext.Provider value={{ state, dispatch, search, setSearch, notice, setNotice, storageError }}>{children}</AdminContext.Provider>;
}
export const useAdmin = () => useContext(AdminContext);
