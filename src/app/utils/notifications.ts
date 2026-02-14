import { MatrixClient, ReceiptType } from '$types/matrix-sdk';

export async function markAsRead(mx: MatrixClient, roomId: string, privateReceipt?: boolean) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  const timeline = room.getLiveTimeline().getEvents();
  const readEventId = room.getEventReadUpTo(mx.getUserId()!);

  const getLatestValidEvent = () => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const latestEvent = timeline[i];
      if (latestEvent.getId() === readEventId) return null;
      if (!latestEvent.isSending()) return latestEvent;
    }
    return null;
  };
  if (timeline.length === 0) return;
  const latestEvent = getLatestValidEvent();
  if (latestEvent === null) return;

  const latestEventId = latestEvent.getId();
  if (!latestEventId) return;

  // Match Element Web behavior: send receipt and fully_read marker separately.
  // Keep them independent so a failure in one does not block the other.
  const receiptType = privateReceipt ? ReceiptType.ReadPrivate : undefined;

  const [receiptResult, markerResult] = await Promise.allSettled([
    mx.sendReadReceipt(latestEvent, receiptType),
    mx.setRoomReadMarkers(roomId, latestEventId),
  ]);

  if (receiptResult.status === 'rejected') {
    console.error('Failed to send read receipt', receiptResult.reason);
  }
  if (markerResult.status === 'rejected') {
    console.error('Failed to send fully_read marker', markerResult.reason);
  }
}
