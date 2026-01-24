'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ReloadContextType {
  reloadKey: number;
  triggerReload: () => void;
  isReloading: boolean;
}

const ReloadContext = createContext<ReloadContextType | undefined>(undefined);

export const ReloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  const triggerReload = useCallback(() => {
    setIsReloading(true);
    // Increment reloadKey to trigger re-fetch in components
    setReloadKey(prev => prev + 1);
    // Reset isReloading after a short delay
    setTimeout(() => {
      setIsReloading(false);
    }, 500);
  }, []);

  return (
    <ReloadContext.Provider value={{ reloadKey, triggerReload, isReloading }}>
      {children}
    </ReloadContext.Provider>
  );
};

export const useReload = () => {
  const context = useContext(ReloadContext);
  if (context === undefined) {
    throw new Error('useReload must be used within a ReloadProvider');
  }
  return context;
};
