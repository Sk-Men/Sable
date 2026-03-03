import { Room } from '$types/matrix-sdk';
import { useCallback, useMemo, useState } from 'react';
import { AccountDataEvent } from '$types/matrix/accountData';
import { StateEvent } from '$types/matrix/room';
import {
  getGlobalImagePacks,
  getRoomImagePack,
  getRoomImagePacks,
  getUserImagePack,
  ImagePack,
  ImageUsage,
} from '$plugins/custom-emoji';
import { useMatrixClient } from './useMatrixClient';
import { useAccountDataCallback } from './useAccountDataCallback';
import { useStateEventCallback } from './useStateEventCallback';

const imagePackEqual = (a: ImagePack | undefined, b: ImagePack | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const aImages = Array.from(a.images.collection.entries());
  const bImages = Array.from(b.images.collection.entries());
  if (aImages.length !== bImages.length) return false;
  const sameImages = aImages.every(([shortcode, image], index) => {
    const [otherShortcode, otherImage] = bImages[index];
    if (shortcode !== otherShortcode) return false;
    return (
      image.url === otherImage.url &&
      image.body === otherImage.body &&
      JSON.stringify(image.usage) === JSON.stringify(otherImage.usage) &&
      JSON.stringify(image.info) === JSON.stringify(otherImage.info)
    );
  });
  if (!sameImages) return false;
  return (
    a.id === b.id &&
    a.deleted === b.deleted &&
    a.meta.name === b.meta.name &&
    a.meta.avatar === b.meta.avatar &&
    a.meta.attribution === b.meta.attribution &&
    JSON.stringify(a.meta.usage) === JSON.stringify(b.meta.usage)
  );
};

const imagePackListEqual = (a: ImagePack[], b: ImagePack[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((pack, index) => imagePackEqual(pack, b[index]));
};

export const useUserImagePack = (): ImagePack | undefined => {
  const mx = useMatrixClient();
  const [userPack, setUserPack] = useState(() => getUserImagePack(mx));

  useAccountDataCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() === AccountDataEvent.PoniesUserEmotes) {
          setUserPack((prev) => {
            const next = getUserImagePack(mx);
            return imagePackEqual(prev, next) ? prev : next;
          });
        }
      },
      [mx]
    )
  );

  return userPack;
};

export const useGlobalImagePacks = (): ImagePack[] => {
  const mx = useMatrixClient();
  const [globalPacks, setGlobalPacks] = useState(() => getGlobalImagePacks(mx));

  useAccountDataCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (mEvent.getType() === AccountDataEvent.PoniesEmoteRooms) {
          setGlobalPacks((prev) => {
            const next = getGlobalImagePacks(mx);
            return imagePackListEqual(prev, next) ? prev : next;
          });
        }
      },
      [mx]
    )
  );

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        const eventType = mEvent.getType();
        const roomId = mEvent.getRoomId();
        const stateKey = mEvent.getStateKey();
        if (eventType === StateEvent.PoniesRoomEmotes && roomId && typeof stateKey === 'string') {
          setGlobalPacks((prev) => {
            const global = !!prev.find(
              (pack) =>
                pack.address && pack.address.roomId === roomId && pack.address.stateKey === stateKey
            );
            if (!global) return prev;
            const next = getGlobalImagePacks(mx);
            return imagePackListEqual(prev, next) ? prev : next;
          });
        }
      },
      [mx]
    )
  );

  return globalPacks;
};

export const useRoomImagePack = (room: Room, stateKey: string): ImagePack | undefined => {
  const mx = useMatrixClient();
  const [roomPack, setRoomPack] = useState(() => getRoomImagePack(room, stateKey));

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (
          mEvent.getRoomId() === room.roomId &&
          mEvent.getType() === StateEvent.PoniesRoomEmotes &&
          mEvent.getStateKey() === stateKey
        ) {
          setRoomPack((prev) => {
            const next = getRoomImagePack(room, stateKey);
            return imagePackEqual(prev, next) ? prev : next;
          });
        }
      },
      [room, stateKey]
    )
  );

  return roomPack;
};

export const useRoomImagePacks = (room: Room): ImagePack[] => {
  const mx = useMatrixClient();
  const [roomPacks, setRoomPacks] = useState(() => getRoomImagePacks(room));

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (
          mEvent.getRoomId() === room.roomId &&
          mEvent.getType() === StateEvent.PoniesRoomEmotes
        ) {
          setRoomPacks((prev) => {
            const next = getRoomImagePacks(room);
            return imagePackListEqual(prev, next) ? prev : next;
          });
        }
      },
      [room]
    )
  );

  return roomPacks;
};

export const useRoomsImagePacks = (rooms: Room[]) => {
  const mx = useMatrixClient();
  const [roomPacks, setRoomPacks] = useState(() => rooms.flatMap(getRoomImagePacks));

  useStateEventCallback(
    mx,
    useCallback(
      (mEvent) => {
        if (
          rooms.find((room) => room.roomId === mEvent.getRoomId()) &&
          mEvent.getType() === StateEvent.PoniesRoomEmotes
        ) {
          setRoomPacks((prev) => {
            const next = rooms.flatMap(getRoomImagePacks);
            return imagePackListEqual(prev, next) ? prev : next;
          });
        }
      },
      [rooms]
    )
  );

  return roomPacks;
};

export const useRelevantImagePacks = (usage: ImageUsage, rooms: Room[]): ImagePack[] => {
  const userPack = useUserImagePack();
  const globalPacks = useGlobalImagePacks();
  const roomsPacks = useRoomsImagePacks(rooms);

  const relevantPacks = useMemo(() => {
    const packs = userPack ? [userPack] : [];
    const globalPackIds = new Set(globalPacks.map((pack) => pack.id));

    const relPacks = packs.concat(
      globalPacks,
      roomsPacks.filter((pack) => !globalPackIds.has(pack.id))
    );

    return relPacks.filter((pack) => pack.getImages(usage).length > 0);
  }, [userPack, globalPacks, roomsPacks, usage]);

  return relevantPacks;
};
