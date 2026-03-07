// Modal for message forwarding, which allows users to select a room to forward the message to

import { useMatrixClient } from '$hooks/useMatrixClient';
import { modalAtom, ModalType } from '$state/modal';
import {
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  Icons,
  IconButton,
  MenuItem,
  Text,
  config,
  Scroll,
} from 'folds';
import { useAtomValue, useSetAtom } from 'jotai';
import { MatrixEvent, Room } from '$types/matrix-sdk';
import { useEffect, useMemo, useState } from 'react';
import { allRoomsAtom } from '$state/room-list/roomList';
import { useAllJoinedRoomsSet, useGetRoom } from '$hooks/useGetRoom';
import { factoryRoomIdByActivity } from '$utils/sort';

// Message forwarding component
export function MessageForwardItem({
  room,
  mEvent,
  onClose,
}: {
  room: Room;
  mEvent: MatrixEvent;
  onClose: () => void;
}) {
  const setModal = useSetAtom(modalAtom);

  const handleClick = () => {
    setModal({
      type: ModalType.Forward,
      room,
      mEvent,
    });
    onClose();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.ReplyArrow} />}
      radii="300"
      onClick={handleClick}
    >
      <Text as="span" size="T300" truncate>
        Forward
      </Text>
    </MenuItem>
  );
}

type MessageForwardInternalProps = {
  room: Room;
  mEvent: MatrixEvent;
  onClose: () => void;
};

type ForwardMeta = {
  v: 1;
  is_forwarded: true;
  original_timestamp: number;
  original_room_id: string;
};

export function MessageForwardInternal({ room, mEvent, onClose }: MessageForwardInternalProps) {
  const mx = useMatrixClient();

  const [isTargetSelected, setIsTargetSelected] = useState(false);
  const [isForwardSuccess, setIsForwardSuccess] = useState(false);
  const [isForwardError, setIsForwardError] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);

  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allJoinedRooms);
  // possible targets to forward the message to
  const forwardTargets = useMemo(
    () =>
      allRooms
        .filter((id) => id !== room.roomId)
        .filter((id) => {
          const target = getRoom(id);
          return !!target && !target.isSpaceRoom() && target.maySendMessage();
        })
        .sort(factoryRoomIdByActivity(mx)),
    [allRooms, room.roomId, getRoom, mx]
  );

  useEffect(() => {
    if (isForwardSuccess) {
      setTimeout(() => {
        // close the modal if the message was forwarded successfully
        onClose();
      }, 2000);
    }
  }, [isForwardSuccess, onClose]);

  // actually forward the message to the selected room
  const handleForwardClick = () => {
    if (!targetRoomId) return;

    const targetRoom = getRoom(targetRoomId);
    const eventId = mEvent.getId();
    if (!targetRoom || !eventId) return;

    type SendEventType = Parameters<typeof mx.sendEvent>[2];
    type SendEventContent = Parameters<typeof mx.sendEvent>[3];

    const eventType = mEvent.getType() as SendEventType;
    // using reference relation to indicate that this is a forwarded message,
    // which allows clients to display it as such
    // maybe not the best idea to include the original room id as that could leak information about the user's room list
    const content = {
      ...mEvent.getContent(),
      'm.relates_to': {
        rel_type: 'm.reference',
        event_id: eventId,
      },
      'moe.sable.message.forward': {
        v: 1,
        is_forwarded: true,
        original_timestamp: mEvent.getTs(),
        original_room_id: room.roomId,
      } satisfies ForwardMeta,
    };

    try {
      mx.sendEvent(targetRoom.roomId, null, eventType, content as unknown as SendEventContent).then(
        () => setIsForwardSuccess(true)
      );
    } catch {
      setIsForwardSuccess(false);
      setIsForwardError(true);
    }
  };

  return (
    <Dialog variant="Surface">
      <Header
        style={{
          padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
          borderBottomWidth: config.borderWidth.B300,
        }}
        variant="Surface"
        size="500"
      >
        <Box grow="Yes">
          <Text size="H4">Forward Message</Text>
        </Box>
        <IconButton size="300" onClick={onClose} radii="300">
          <Icon src={Icons.Cross} />
        </IconButton>
      </Header>
      <Box direction="Column" style={{ height: '300px' }}>
        <Scroll hideTrack>
          <Box direction="Column" style={{ padding: config.space.S300 }}>
            {forwardTargets.map((roomId) => {
              const target = getRoom(roomId);
              if (!target) return null;
              return (
                <MenuItem
                  key={roomId}
                  data-room-id={roomId}
                  onClick={() => {
                    setIsTargetSelected(true);
                    setTargetRoomId(roomId);
                  }}
                  variant={targetRoomId === roomId ? 'Success' : 'Surface'}
                  aria-pressed={targetRoomId === roomId}
                  size="400"
                  radii="400"
                >
                  <Text truncate>{target.name}</Text>
                </MenuItem>
              );
            })}
          </Box>
        </Scroll>
        {isTargetSelected && targetRoomId && (
          <Button style={{ margin: config.space.S300 }} onClick={handleForwardClick}>
            <Text>Forward to {getRoom(targetRoomId)?.name}</Text>
          </Button>
        )}
        {isForwardError && (
          <Text size="T300" color="Critical600" style={{ margin: config.space.S300 }}>
            Failed to forward message. Please try again.
          </Text>
        )}
      </Box>
    </Dialog>
  );
}
