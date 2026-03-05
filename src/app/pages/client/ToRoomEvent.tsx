import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { activeSessionIdAtom, pendingNotificationAtom } from '$state/sessions';

// ToRoomEvent handles the /to/:room_id/:event_id route used by the SW when it
// opens a new window for a push notification (killed-app case) OR by client.navigate()
// on iOS where postMessage is unreliable after focus().
//
// It does NOT navigate itself. Instead it writes to pendingNotificationAtom so
// that NotificationJumper handles the actual navigation once the correct client
// is synced. This survives the ClientRoot account-switch reload that happens when
// setActiveSessionId() changes the active session: ToRoomEvent unmounts as soon
// as ClientRoot calls navigate(getHomePath()), but the atom value persists and
// NotificationJumper picks it up once the new client is ready.
export function ToRoomEvent() {
  const { room_id: roomId, event_id: eventId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('uid') ?? undefined;
  const setActiveSessionId = useSetAtom(activeSessionIdAtom);
  const setPending = useSetAtom(pendingNotificationAtom);

  useEffect(() => {
    if (!roomId) return;
    const rid = roomId; // narrowed to string
    if (targetUserId) setActiveSessionId(targetUserId);
    setPending({ roomId: rid, eventId, targetSessionId: targetUserId });
    // Push a clean entry onto history so the back button doesn't return to /to/…
    if (window.history.length <= 2) {
      window.history.pushState({}, '', '/');
    }
  }, [roomId, eventId, targetUserId, setActiveSessionId, setPending]);

  return null;
}
