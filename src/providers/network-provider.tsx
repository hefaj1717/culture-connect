import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type NetworkContextValue = {
  isOffline: boolean;
  isReachable: boolean | null;
  refresh: () => Promise<void>;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

function getIsOffline(state: NetInfoState) {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isReachable, setIsReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    NetInfo.fetch().then((state) => {
      if (!active) return;
      setIsOffline(getIsOffline(state));
      setIsReachable(state.isInternetReachable);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(getIsOffline(state));
      setIsReachable(state.isInternetReachable);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      isOffline,
      isReachable,
      refresh: async () => {
        const state = await NetInfo.fetch();
        setIsOffline(getIsOffline(state));
        setIsReachable(state.isInternetReachable);
      },
    }),
    [isOffline, isReachable],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used inside NetworkProvider');
  }

  return context;
}
