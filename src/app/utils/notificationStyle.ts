export const DEFAULT_NOTIFICATION_ICON = '/public/res/apple/apple-touch-icon-180x180.png';
export const DEFAULT_NOTIFICATION_BADGE = '/public/res/apple/apple-touch-icon-72x72.png';
export const DEFAULT_MESSAGE_PREVIEW = 'new message';
export const ENCRYPTED_MESSAGE_PREVIEW = 'Encrypted message';

type RoomMessageNotificationInput = {
  roomName?: string;
  username?: string;
  roomAvatar?: string;
  previewText?: string;
  silent?: boolean;
  eventId?: string;
  data?: unknown;
};

type NotificationPayload = {
  title: string;
  options: NotificationOptions;
};

type NotificationPreviewInput = {
  content?: unknown;
  eventType?: string;
  isEncryptedRoom?: boolean;
  showMessageContent: boolean;
  showEncryptedMessageContent: boolean;
};

const getString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const getBodyFromContent = (content: unknown): string | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  const { body } = content as Record<string, unknown>;
  if (typeof body !== 'string') return undefined;
  const normalized = body.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const resolveNotificationPreviewText = ({
  content,
  eventType,
  isEncryptedRoom,
  showMessageContent,
  showEncryptedMessageContent,
}: NotificationPreviewInput): string => {
  const encryptedContext = isEncryptedRoom || eventType === 'm.room.encrypted';

  if (!showMessageContent) {
    return encryptedContext ? ENCRYPTED_MESSAGE_PREVIEW : DEFAULT_MESSAGE_PREVIEW;
  }
  if (encryptedContext && !showEncryptedMessageContent) {
    return ENCRYPTED_MESSAGE_PREVIEW;
  }

  const body = getBodyFromContent(content);
  if (body) return body;

  return encryptedContext ? ENCRYPTED_MESSAGE_PREVIEW : DEFAULT_MESSAGE_PREVIEW;
};

export const buildRoomMessageNotification = ({
  roomName,
  username,
  roomAvatar,
  previewText,
  silent,
  eventId,
  data,
}: RoomMessageNotificationInput): NotificationPayload => {
  const sender = getString(username, 'Someone');
  const room = getString(roomName, 'Unknown');
  const message = getString(previewText, DEFAULT_MESSAGE_PREVIEW);
  const avatar = getString(roomAvatar, DEFAULT_NOTIFICATION_ICON);

  return {
    title: `${sender} in ${room}`,
    options: {
      icon: avatar,
      badge: avatar || DEFAULT_NOTIFICATION_BADGE,
      body: `${sender}: ${message}`,
      silent,
      tag: eventId ?? `${room}-${sender}`,
      data,
    },
  };
};
