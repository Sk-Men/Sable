import { CryptoEvent, CryptoEventHandlerMap } from '$types/matrix-sdk';
import { useEffect } from 'react';
import { useMatrixClient } from './useMatrixClient';

export const useUserTrustStatusChange = (
  onChange: CryptoEventHandlerMap[CryptoEvent.UserTrustStatusChanged]
) => {
  const mx = useMatrixClient();

  useEffect(() => {
    mx.on(CryptoEvent.UserTrustStatusChanged, onChange);
    return () => {
      mx.removeListener(CryptoEvent.UserTrustStatusChanged, onChange);
    };
  }, [mx, onChange]);
};
