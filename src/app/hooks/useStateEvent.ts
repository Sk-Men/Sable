import { Room } from '$types/matrix-sdk';
import { useCallback, useMemo } from 'react';
import { useStateEventCallback } from './useStateEventCallback';
import { useForceUpdate } from './useForceUpdate';
import { getStateEvent } from '../utils/room';
import { StateEvent } from '$types/matrix/room';

export const useStateEvent = (room: Room, eventType: StateEvent, stateKey = '') => {
  const [updateCount, forceUpdate] = useForceUpdate();

  useStateEventCallback(
    room.client,
    useCallback(
      (event) => {
        if (
          event.getRoomId() === room.roomId &&
          event.getType() === eventType &&
          event.getStateKey() === stateKey
        ) {
          forceUpdate();
        }
      },
      [room, eventType, stateKey, forceUpdate]
    )
  );

  return useMemo(
    () => getStateEvent(room, eventType, stateKey),
     
    [room, eventType, stateKey, updateCount]
  );
};
