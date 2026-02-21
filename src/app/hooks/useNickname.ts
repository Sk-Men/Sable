import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { nicknamesAtom, setNicknameAtom } from '../state/nicknames';

export const useNickname = (userId: string): string | undefined => {
  const nicknames = useAtomValue(nicknamesAtom);
  return nicknames[userId];
};

export const useSetNickname = () => {
  const setNick = useSetAtom(setNicknameAtom);
  return useCallback(
    (userId: string, nick: string | undefined) => setNick(userId, nick),
    [setNick]
  );
};

