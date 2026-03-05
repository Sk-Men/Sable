import { useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { SyncState, ClientEvent } from '$types/matrix-sdk';
import { activeSessionIdAtom, pendingNotificationAtom } from '../state/sessions';
import { useSyncState } from './useSyncState';
import { useMatrixClient } from './useMatrixClient';
import { useRoomNavigate } from './useRoomNavigate';
import { createLogger } from '../utils/debug';

export function NotificationJumper() {
  const [pending, setPending] = useAtom(pendingNotificationAtom);
  const activeSessionId = useAtomValue(activeSessionIdAtom);
  const mx = useMatrixClient();
  const { navigateRoom } = useRoomNavigate();
  const log = createLogger('NotificationJumper');

  // Set true the moment we fire navigateRoom. Only reset when `pending` changes
  // to a new value (via the effect below). Do NOT reset inside performJump itself:
  // setPending(null) is async — resetting here creates a window where atom/render
  // churn re-calls performJump (from the ClientEvent.Room listener or effect
  // re-runs) before React has committed the null, causing repeated navigation.
  const jumpingRef = useRef(false);

  const performJump = useCallback(() => {
    if (!pending || jumpingRef.current) return;
    if (pending.targetSessionId && pending.targetSessionId !== activeSessionId) {
      log.log('waiting for target session atom...', {
        targetSessionId: pending.targetSessionId,
        activeSessionId,
      });
      return;
    }

    // The mx client context may lag one render behind the atom — wait until it catches up.
    if (pending.targetSessionId && mx.getUserId() !== pending.targetSessionId) {
      log.log('waiting for mx client to switch to target session...', {
        targetSessionId: pending.targetSessionId,
        currentUserId: mx.getUserId(),
      });
      return;
    }

    const isSyncing = mx.getSyncState() === SyncState.Syncing;
    const room = mx.getRoom(pending.roomId);
    const isJoined = room?.getMyMembership() === 'join';

    if (isSyncing && isJoined) {
      log.log('jumping to:', pending.roomId);
      jumpingRef.current = true;
      navigateRoom(pending.roomId, pending.eventId);
      setPending(null);
      // jumpingRef stays true until pending changes — see effect below.
    } else {
      log.log('still waiting for room data...', {
        isSyncing,
        hasRoom: !!room,
        membership: room?.getMyMembership(),
      });
    }
  }, [pending, activeSessionId, mx, navigateRoom, setPending, log]);

  // Reset the guard only when pending is replaced (new notification or cleared).
  useEffect(() => {
    jumpingRef.current = false;
  }, [pending]);

  // Keep a stable ref to the latest performJump so that the listeners below
  // always invoke the current version without adding performJump to their dep
  // arrays. Adding performJump as a dep causes the effect to re-run (and call
  // performJump again) on every atom change during an account switch — that is
  // the second source of repeated navigation.
  const performJumpRef = useRef(performJump);
  performJumpRef.current = performJump;

  useSyncState(
    mx,
    // Stable callback — reads from ref, so useSyncState never re-registers.
    useCallback((current) => {
      if (current === SyncState.Syncing) performJumpRef.current();
    }, [])
  );

  useEffect(() => {
    if (!pending) return undefined;

    const onRoom = () => performJumpRef.current();
    mx.on(ClientEvent.Room, onRoom);
    performJumpRef.current();

    return () => {
      mx.removeListener(ClientEvent.Room, onRoom);
    };
  }, [pending, mx]); // performJump intentionally omitted — use ref above

  return null;
}
