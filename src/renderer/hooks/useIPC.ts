import { useEffect, useState } from 'react';

export const useIPC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      setIsReady(true);
    }
  }, []);

  return {
    api: window.electronAPI,
    isReady,
  };
};
