import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMatrixClient } from './useMatrixClient';
import { profilesCacheAtom } from '../state/userRoomProfile';

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
  pronouns?: any[];
  timezone?: string;
  bio?: string;
  bannerUrl?: string;
  nameColor?: string;
  extended?: Record<string, any>;
  _fetched?: boolean;
};

const normalizeInfo = (info: any): UserProfile => ({
  avatarUrl: info.avatar_url,
  displayName: info.displayname,
  pronouns: info['io.fsky.nyx.pronouns'],
  timezone: info['us.cloke.msc4175.tz'] || info['m.tz'],
  bio: info['moe.sable.app.bio'] || info['chat.commet.profile_bio'],
  bannerUrl: info['chat.commet.profile_banner'],
  nameColor: info['moe.sable.app.name_color'],
  extended: {},
  _fetched: true,
});

export const useUserProfile = (userId: string, initialProfile?: Partial<UserProfile>): UserProfile => {
  const mx = useMatrixClient();

  const userSelector = useMemo(
    () => selectAtom(profilesCacheAtom, (db) => db[userId]),
    [userId]
  );

  const cached = useAtomValue(userSelector);
  const setGlobalProfiles = useSetAtom(profilesCacheAtom);

  const needsFetch = !!userId && userId !== 'undefined' && !cached?._fetched;

  useEffect(() => {
    if (!needsFetch) return;

    let isMounted = true;

    mx.getProfileInfo(userId).then((info: any) => {
      if (!isMounted) return;

      const normalized = normalizeInfo(info);

      setGlobalProfiles((prev) => {
        const existing = prev[userId];

        if (
          existing?.nameColor === normalized.nameColor &&
          existing?.displayName === normalized.displayName &&
          existing?._fetched === true
        ) {
          return prev;
        }

        return {
          ...prev,
          [userId]: { ...existing, ...normalized }
        };
      });
    }).catch(() => {
      setGlobalProfiles((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], _fetched: true }
      }));
    });

    return () => { isMounted = false; };
  }, [userId, needsFetch, mx, setGlobalProfiles]);

  return useMemo(() => {
    if (cached) return cached;

    const user = mx.getUser(userId);
    return {
      displayName: initialProfile?.displayName ?? user?.displayName,
      avatarUrl: initialProfile?.avatarUrl ?? user?.avatarUrl,
      ...initialProfile,
    };
  }, [cached, userId, initialProfile, mx]);
};