import { useCallback, useEffect } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtomValue } from 'jotai';
import { ScreenSize, useScreenSizeContext } from '$hooks/useScreenSize';
import { useSetting } from '$state/hooks/settings';
import { settingsAtom } from '$state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '$hooks/usePowerLevels';
import { useRoom } from '$hooks/useRoom';
import { useKeyDown } from '$hooks/useKeyDown';
import { markAsRead } from '$utils/notifications';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useRoomMembers } from '$hooks/useRoomMembers';
import { CallView } from '$features/call/CallView';
import { WidgetsDrawer } from '$features/widgets/WidgetsDrawer';
import { callChatAtom } from '$state/callEmbed';
import { createDebugLogger } from '$utils/debugLogger';
import { RoomViewHeader } from './RoomViewHeader';
import { MembersDrawer } from './MembersDrawer';
import { RoomView } from './RoomView';
import { CallChatView } from './CallChatView';

const debugLog = createDebugLogger('Room');

export function Room() {
  const { eventId } = useParams();
  const room = useRoom();
  const mx = useMatrixClient();

  // Log room mount
  useEffect(() => {
    debugLog.info('ui', 'Room component mounted', { roomId: room.roomId, eventId });
    return () => {
      debugLog.info('ui', 'Room component unmounted', { roomId: room.roomId });
    };
  }, [room.roomId, eventId]);

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [isWidgetDrawerOpen] = useSetting(settingsAtom, 'isWidgetDrawer');
  const [hideReads] = useSetting(settingsAtom, 'hideReads');
  const screenSize = useScreenSizeContext();

  // Log drawer state changes
  useEffect(() => {
    debugLog.debug('ui', 'Members drawer state changed', { roomId: room.roomId, isOpen: isDrawer });
  }, [isDrawer, room.roomId]);

  useEffect(() => {
    debugLog.debug('ui', 'Widgets drawer state changed', {
      roomId: room.roomId,
      isOpen: isWidgetDrawerOpen,
    });
  }, [isWidgetDrawerOpen, room.roomId]);
  const powerLevels = usePowerLevels(room);
  const members = useRoomMembers(mx, room.roomId);
  const chat = useAtomValue(callChatAtom);

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          markAsRead(mx, room.roomId, hideReads);
        }
      },
      [mx, room.roomId, hideReads]
    )
  );

  const callView = room.isCallRoom();

  // Log call view state
  useEffect(() => {
    debugLog.debug('ui', 'Room view mode', { roomId: room.roomId, callView, chatOpen: chat });
  }, [callView, chat, room.roomId]);

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes">
        {callView && (screenSize === ScreenSize.Desktop || !chat) && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader callView />
            <Box grow="Yes">
              <CallView />
            </Box>
          </Box>
        )}
        {!callView && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader />
            <Box grow="Yes">
              <RoomView eventId={eventId} />
            </Box>
          </Box>
        )}

        {callView && chat && (
          <>
            {screenSize === ScreenSize.Desktop && (
              <Line variant="Background" direction="Vertical" size="300" />
            )}
            <CallChatView />
          </>
        )}
        {!callView && screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <MembersDrawer key={room.roomId} room={room} members={members} />
          </>
        )}
        {screenSize === ScreenSize.Desktop && isWidgetDrawerOpen && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <WidgetsDrawer key={`widgets-${room.roomId}`} room={room} />
          </>
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
