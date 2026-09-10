import React, { createContext, useContext, useState } from 'react';
import { initialState } from './data/seed';
import { STORAGE_KEY, transact } from './services/portal';
const Context = createContext(null);
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data?.applications && data?.sessions && data?.profile) return data;
  } catch {}
  return structuredClone(initialState);
}
export function PortalProvider({ children }) {
  const [state, setState] = useState(load);
  const [storageError, setStorageError] = useState('');
  const run = (action) => {
    const next = transact(state, action);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError(
        'Browser storage is unavailable or full. Your changes will last only until this page closes.',
      );
    }
    setState(next);
    return next;
  };
  return (
    <Context.Provider value={{ state, run, storageError }}>
      {children}
    </Context.Provider>
  );
}
export const usePortal = () => useContext(Context);
