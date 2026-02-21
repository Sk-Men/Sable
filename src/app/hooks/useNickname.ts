import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { nicknamesAtom, setNicknameAtom } from '../state/nicknames';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useAccountDataCallback } from './useAccountDataCallback';
import { useMatrixClient } from './useMatrixClient';

export const useNickname = (userId: string): string | undefined => {
  const nicknames = useAtomValue(nicknamesAtom);
  return nicknames[userId];
};

export const useSetNickname = () => {
  const mx = useMatrixClient();
  const setNick = useSetAtom(setNicknameAtom);

  return useCallback(
    (userId: string, nick: string | undefined) => {
      setNick(userId, nick, mx);
    },
    [mx, setNick]
  );
};

export const useSyncNicknames = (mx: MatrixClient) => {
  const setNicknames = useSetAtom(nicknamesAtom);

  useEffect(() => {
    const event = mx.getAccountData(AccountDataEvent.SableNicknames);
    if (event) {
      setNicknames(event.getContent() || {});
    }
  }, [mx, setNicknames]);

  useAccountDataCallback(
    mx,
    (mEvent) => {
      if (mEvent.getType() === AccountDataEvent.SableNicknames) {
        setNicknames(mEvent.getContent() || {});
      }
    }
  )
}