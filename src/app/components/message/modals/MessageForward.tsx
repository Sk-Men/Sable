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
import { useMemo, useState } from 'react';
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

export function MessageForwardInternal({ room, mEvent, onClose }: MessageForwardInternalProps) {
  const mx = useMatrixClient();

  const [isTargetSelected, setIsTargetSelected] = useState(false);
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
          return !!target && !target.isSpaceRoom();
        })
        .sort(factoryRoomIdByActivity(mx)),
    [allRooms, room.roomId, getRoom, mx]
  );

  // actually forward the message to the selected room
  const handleForwardClick = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    const { roomId } = event.currentTarget.dataset;
    if (!roomId) return;

    const targetRoom = getRoom(roomId);
    const eventId = mEvent.getId();
    if (!targetRoom || !eventId) return;

    type SendEventType = Parameters<typeof mx.sendEvent>[2];
    type SendEventContent = Parameters<typeof mx.sendEvent>[3];

    const eventType = mEvent.getType() as SendEventType;
    const content = {
      ...mEvent.getContent(),
      'm.relates_to': {
        'm.in_reply_to': {
          event_id: eventId,
        },
      },
    } as SendEventContent;

    mx.sendEvent(targetRoom.roomId, null, eventType, content);
    onClose();
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
        {isTargetSelected && (
          <Button style={{ margin: config.space.S300 }} onClick={handleForwardClick}>
            <Text>Send</Text>
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
