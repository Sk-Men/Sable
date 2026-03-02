/* eslint-disable camelcase */
import { EventType } from "matrix-js-sdk/lib/@types/event";
import { buildRoomMessageNotification, DEFAULT_NOTIFICATION_ICON, DEFAULT_NOTIFICATION_BADGE } from '../app/utils/notificationStyle';

type NotificationSettings = {
  notificationSoundEnabled: boolean;
};

export const usePushNotifications = (
  self: ServiceWorkerGlobalScope,
  getNotificationSettings: () => NotificationSettings
) => {

  const resolveSilent = (silent: unknown): boolean => {
    if (typeof silent === 'boolean') return silent;
    return !getNotificationSettings().notificationSoundEnabled;
  };

  const showNotificationWithData = async (
    title: string,
    body: string | undefined,
    data: any,
    silent?: boolean
  ) => {
    await self.registration.showNotification(title, {
      body,
      icon: DEFAULT_NOTIFICATION_ICON,
      badge: DEFAULT_NOTIFICATION_BADGE,
      tag: data?.event_id ?? "Cinny",
      silent,
      data
    });
  };

  const handleRoomMessageNotification = async (pushData: any) => {
    const data = {
      type: pushData!.type,
      room_id: pushData!.room_id,
      event_id: pushData!.event_id,
      timestamp: Date.now(),
      ...pushData.data
    };
    const notificationPayload = buildRoomMessageNotification({
      roomName: pushData?.room_name,
      username: pushData?.sender_display_name,
      roomAvatar: pushData?.room_avatar_url,
      previewText: pushData?.content?.body,
      silent: resolveSilent(pushData?.silent),
      eventId: pushData?.event_id,
      data,
    });
    await showNotificationWithData(
      notificationPayload.title,
      notificationPayload.options.body,
      data,
      notificationPayload.options.silent ?? undefined
    );
  }

  const handleEncryptedMessageNotification = async (pushData: any) => {
    const data = {
      type: pushData!.type,
      room_id: pushData!.room_id,
      event_id: pushData!.event_id,
      timestamp: Date.now(),
      ...pushData.data
    };
    const notificationPayload = buildRoomMessageNotification({
      roomName: pushData?.room_name,
      username: pushData?.sender_display_name,
      roomAvatar: pushData?.room_avatar_url,
      previewText: 'Encrypted message',
      silent: resolveSilent(pushData?.silent),
      eventId: pushData?.event_id,
      data,
    });
    await showNotificationWithData(
      notificationPayload.title,
      notificationPayload.options.body,
      data,
      notificationPayload.options.silent ?? undefined
    );
  }

  const handleInvitationNotification = async (pushData: any) => {
    const sender_display_name = pushData?.sender_display_name;
    const room_name = pushData?.room_name;

    let body = "";
    if (sender_display_name && room_name)
      body = `${sender_display_name} invites you to ${room_name}`;
    if (sender_display_name && !room_name)
      body = `from ${sender_display_name}`;
    if (!sender_display_name && room_name)
      body = `to ${room_name}`;
    if (!sender_display_name && !room_name)
      body = "";

    const data = {
      type: pushData!.type,
      content: pushData!.content,
      timestamp: Date.now(),
      ...pushData.data
    }

    await showNotificationWithData(
      "New Invitation",
      body,
      data,
      resolveSilent(pushData?.silent)
    )
  };

  const fallbackNotification = async (pushData: any) => {
    const body = pushData?.content?.body;
    let title;
    if (body) {
      title = pushData?.sender_display_name
        ? `${pushData.sender_display_name}${pushData?.room_name ? ` in ${pushData.room_name}` : ''}`
        : "New Notification";
    } else {
      title = "You have a new Notification";
    }
    const data = {
      type: pushData?.type,
      room_id: pushData?.room_id,
      event_id: pushData?.event_id,
      timestamp: Date.now(),
      ...pushData.data
    };
    await showNotificationWithData(title, body, data, resolveSilent(pushData?.silent));
  };

  const handlePushNotificationPushData = async (pushData: any) => {
    const eventType = pushData?.type as (EventType | undefined);
    if (!eventType) {
      console.warn("no event type");
    }

    switch (eventType) {
      case EventType.RoomMessage:
      case EventType.Sticker:
        return handleRoomMessageNotification(pushData);
      case EventType.RoomMessageEncrypted:
        return handleEncryptedMessageNotification(pushData);
      case EventType.RoomMember:
        if (!(pushData?.content?.membership === "invite")) break;
        return handleInvitationNotification(pushData);

      default:
        // no voip support in app anyway
        break;
    }

    return fallbackNotification(pushData);
  };

  return { handlePushNotificationPushData };
}
