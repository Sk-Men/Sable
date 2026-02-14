import { useParams } from 'react-router-dom';
import { getCanonicalAliasRoomId, isRoomAlias } from '$appUtils/matrix';
import { tryDecodeURIComponent } from '$appUtils/dom';
import { useMatrixClient } from '../useMatrixClient';

export const useSelectedRoom = (): string | undefined => {
  const mx = useMatrixClient();

  const { roomIdOrAlias: encodedRoomIdOrAlias } = useParams();
  const roomIdOrAlias = encodedRoomIdOrAlias
    ? tryDecodeURIComponent(encodedRoomIdOrAlias)
    : undefined;
  const roomId =
    roomIdOrAlias && isRoomAlias(roomIdOrAlias)
      ? getCanonicalAliasRoomId(mx, roomIdOrAlias)
      : roomIdOrAlias;

  return roomId;
};
