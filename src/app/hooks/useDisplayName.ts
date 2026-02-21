import { useAtomValue } from 'jotai';
import type { Room } from 'matrix-js-sdk';
import { nicknamesAtom } from '../state/nicknames';
import { getMemberDisplayName } from '../utils/room';
import { getMxIdLocalPart } from '../utils/matrix';

/**
 * Returns the display name for a user, preferring any locally-set nickname,
 * then the room member display name, then the local part of the MXID.
 */
export const useDisplayName = (userId: string, room?: Room): string => {
  const nicknames = useAtomValue(nicknamesAtom);
  if (room) {
    return getMemberDisplayName(room, userId, nicknames) ?? getMxIdLocalPart(userId) ?? userId;
  }
  return nicknames[userId] ?? getMxIdLocalPart(userId) ?? userId;
};

