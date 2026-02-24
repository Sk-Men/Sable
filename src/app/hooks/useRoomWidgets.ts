import { Room, MatrixEvent } from 'matrix-js-sdk';
import { useCallback, useMemo } from 'react';
import { IWidget } from 'matrix-widget-api';
import { useStateEventCallback } from './useStateEventCallback';
import { useForceUpdate } from './useForceUpdate';
import { getStateEvents } from '../utils/room';
import { StateEvent } from '../../types/matrix/room';

export interface RoomWidget extends IWidget {
  eventId?: string;
  sender?: string;
}

export const resolveWidgetUrl = (
  url: string,
  roomId: string,
  userId: string,
  displayName: string,
  avatarUrl: string,
  widgetId: string
): string =>
  url
    .replace(/\$matrix_user_id/g, encodeURIComponent(userId))
    .replace(/\$matrix_room_id/g, encodeURIComponent(roomId))
    .replace(/\$matrix_display_name/g, encodeURIComponent(displayName))
    .replace(/\$matrix_avatar_url/g, encodeURIComponent(avatarUrl))
    .replace(/\$matrix_widget_id/g, encodeURIComponent(widgetId));

export const useRoomWidgets = (room: Room): RoomWidget[] => {
  const [updateCount, forceUpdate] = useForceUpdate();

  useStateEventCallback(
    room.client,
    useCallback(
      (event) => {
        if (
          event.getRoomId() === room.roomId &&
          event.getType() === StateEvent.RoomWidget
        ) {
          forceUpdate();
        }
      },
      [room.roomId, forceUpdate]
    )
  );

  return useMemo(() => {
    const events: MatrixEvent[] = getStateEvents(room, StateEvent.RoomWidget);

    return events.reduce<RoomWidget[]>((widgets, event) => {
      const content = event.getContent();
      if (!content || !content.url || Object.keys(content).length === 0) return widgets;

      const stateKey = event.getStateKey();
      if (!stateKey) return widgets;

      widgets.push({
        id: content.id || stateKey,
        creatorUserId: content.creatorUserId || event.getSender() || '',
        type: content.type || 'm.custom',
        url: content.url,
        name: content.name || 'Widget',
        data: content.data || {},
        waitForIframeLoad: content.waitForIframeLoad ?? true,
        eventId: event.getId(),
        sender: event.getSender() || undefined,
      });

      return widgets;
    }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, updateCount]);
};

