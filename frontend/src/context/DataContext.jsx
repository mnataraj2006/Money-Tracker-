import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [cache, setCache] = useState({
    dashboard: null,
    transactions: null,
    cash: null,
    history: null,
    historyByMonth: {}
  });

  const updateCache = (key, value) => {
    setCache(prev => ({ ...prev, [key]: value }));
  };

  const clearCache = () => {
    setCache({
      dashboard: null,
      transactions: null,
      cash: null,
      history: null,
      historyByMonth: {}
    });
  };

  return (
    <DataContext.Provider value={{ cache, updateCache, clearCache }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataContext);
  if (!context) {
    return { cache: {}, updateCache: () => {}, clearCache: () => {} };
  }
  return context;
}
