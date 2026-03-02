import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { SyncState, ClientEvent } from '$types/matrix-sdk';
import { pendingNotificationAtom } from '$state/sessions';
import { useSyncState } from './useSyncState';
import { useMatrixClient } from './useMatrixClient';
import { useRoomNavigate } from './useRoomNavigate';
import { createLogger } from '$utils/debug';

export function NotificationJumper() {
  const [pending, setPending] = useAtom(pendingNotificationAtom);
  const mx = useMatrixClient();
  const { navigateRoom } = useRoomNavigate();
  const log = createLogger('NotificationJumper');

  const performJump = useCallback(() => {
    if (!pending) return;

    const isSyncing = mx.getSyncState() === SyncState.Syncing;

    const room = mx.getRoom(pending.roomId);
    const isJoined = room?.getMyMembership() === 'join';

    if (isSyncing && isJoined) {
      log.log('jumping to:', pending.roomId);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          navigateRoom(pending.roomId, pending.eventId);
          setPending(null);
        });
      });
    } else {
      log.log('still waiting for room data...', {
        isSyncing,
        hasRoom: !!room,
        membership: room?.getMyMembership(),
      });
    }
  }, [pending, mx, navigateRoom, setPending, log]);

  useSyncState(
    mx,
    useCallback(
      (current) => {
        if (current === SyncState.Syncing) performJump();
      },
      [performJump]
    )
  );

  useEffect(() => {
    if (!pending) return undefined;

    const onRoom = () => performJump();
    mx.on(ClientEvent.Room, onRoom);
    performJump();

    return () => {
      mx.removeListener(ClientEvent.Room, onRoom);
    };
  }, [pending, mx, performJump]);

  return null;
}
