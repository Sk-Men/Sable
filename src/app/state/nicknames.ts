import { atom } from 'jotai';
import { atomWithLocalStorage, getLocalStorageItem, setLocalStorageItem } from './utils/atomWithLocalStorage';

export const NICKNAMES_KEY = 'sableNicknames';

export type Nicknames = Record<string, string>;

export const nicknamesAtom = atomWithLocalStorage<Nicknames>(
  NICKNAMES_KEY,
  (key) => getLocalStorageItem<Nicknames>(key, {}),
  (key, value) => setLocalStorageItem(key, value)
);

export const setNicknameAtom = atom<null, [userId: string, nick: string | undefined], void>(
  null,
  (get, set, userId, nick) => {
    const prev = get(nicknamesAtom);
    const next = { ...prev };
    if (nick === undefined || nick.trim() === '') {
      delete next[userId];
    } else {
      next[userId] = nick.trim();
    }
    set(nicknamesAtom, next);
  }
);

