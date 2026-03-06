// Modal for message forwarding, which allows users to select a room to forward the message to

import { useMatrixClient } from '$hooks/useMatrixClient';
import { modalAtom, ModalType } from '$state/modal';
import { Avatar, Box, Button, Dialog, Header, Icon, Icons, IconButton, MenuItem, Text, config } from 'folds';
import { useSetAtom } from 'jotai';
import { MatrixEvent, Room } from '$types/matrix-sdk';

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
    </Dialog>
  );
}
