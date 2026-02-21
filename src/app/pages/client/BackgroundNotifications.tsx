import { useEffect, useRef } from 'react';import { createClient, MatrixClient, MatrixEvent, Room, RoomEvent } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';
import { sessionsAtom, activeSessionIdAtom, Session } from '../../state/sessions';
import { notificationPermission } from '../../utils/dom';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { getMxIdLocalPart } from '../../utils/matrix';
import { getMemberDisplayName, getNotificationType, isNotificationEvent } from '../../utils/room';
import { NotificationType } from '../../../types/matrix/room';
import { createLogger } from '../../utils/debug';
import LogoSVG from '../../../../public/res/svg/cinny.svg';
import { nicknamesAtom } from '../../state/nicknames';

const log = createLogger('BackgroundNotifications');

const startBackgroundClient = async (session: Session): Promise<MatrixClient> => {
  const mx = createClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
    timelineSupport: false,
  });
  await mx.startClient({ lazyLoadMembers: true, initialSyncLimit: 0 });
  return mx;
};

export function BackgroundNotifications() {
  const sessions = useAtomValue(sessionsAtom);
  const activeSessionId = useAtomValue(activeSessionIdAtom);
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const nicknames = useAtomValue(nicknamesAtom);
  const nicknamesRef = useRef(nicknames);
  nicknamesRef.current = nicknames;
  const clientsRef = useRef<Map<string, MatrixClient>>(new Map());

  const inactiveSessions = sessions.filter(
    (s) => s.userId !== (activeSessionId ?? sessions[0]?.userId)
  );

  useEffect(() => {
    if (!showNotifications || !notificationPermission('granted')) return;

    const current = clientsRef.current;
    const activeIds = new Set(inactiveSessions.map((s) => s.userId));

    current.forEach((mx, userId) => {
      if (!activeIds.has(userId)) {
        log.log('stopping background client for', userId);
        mx.stopClient();
        current.delete(userId);
      }
    });

    inactiveSessions.forEach((session) => {
      if (current.has(session.userId)) return;

      log.log('starting background client for', session.userId);
      startBackgroundClient(session)
        .then((mx) => {
          current.set(session.userId, mx);

          const handleTimeline = (
            mEvent: MatrixEvent,
            room: Room | undefined,
            toStartOfTimeline: boolean | undefined,
            removed: boolean,
            data: { liveEvent: boolean }
          ) => {
            if (mx.getSyncState() !== 'SYNCING') return;
            if (!room || !data?.liveEvent || room.isSpaceRoom()) return;
            if (!isNotificationEvent(mEvent)) return;
            if (getNotificationType(mx, room.roomId) === NotificationType.Mute) return;

            const sender = mEvent.getSender();
            if (!sender || sender === mx.getUserId()) return;

            const senderName =
              getMemberDisplayName(room, sender, nicknamesRef.current) ?? getMxIdLocalPart(sender) ?? sender;
            const accountLabel = getMxIdLocalPart(session.userId) ?? session.userId;

            const noti = new window.Notification(`${room.name ?? 'Unknown'} (${accountLabel})`, {
              icon: LogoSVG,
              badge: LogoSVG,
              body: `${senderName}: new message`,
              silent: true,
            });
            noti.onclick = () => noti.close();
          };

          mx.on(RoomEvent.Timeline, handleTimeline as unknown as (...args: unknown[]) => void);
        })
        .catch((err) => {
          log.error('failed to start background client for', session.userId, err);
        });
    });

    return () => {
      current.forEach((mx) => mx.stopClient());
      current.clear();
    };
  }, [
    inactiveSessions.map((s) => s.userId).join('\x00'),
    showNotifications,
  ]);

  return null;
}
