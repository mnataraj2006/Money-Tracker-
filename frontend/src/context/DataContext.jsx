import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [cache, setCache] = useState({
    dashboard: null,
    transactions: null,
    cash: null,
    history: null
  });

  const updateCache = (key, value) => {
    setCache(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DataContext.Provider value={{ cache, updateCache }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataContext);
  if (!context) {
    return { cache: {}, updateCache: () => {} };
  }
  return context;
}
