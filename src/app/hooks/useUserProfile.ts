import { useCallback, useEffect, useState } from 'react';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { useAtom } from 'jotai';
import { useMatrixClient } from './useMatrixClient';
import { profilesCacheAtom } from '../state/userRoomProfile';

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
  pronouns?: any[];
  timezone?: string;
  bio?: string;
  bannerUrl?: string;
  extended?: Record<string, any>;
};

export const useUserProfile = (userId: string, initialProfile?: Partial<UserProfile>): UserProfile => {
  const mx = useMatrixClient();
  const [globalProfiles, setGlobalProfiles] = useAtom(profilesCacheAtom);

  const normalizeInfo = useCallback((info: any): UserProfile => {
    const normalized: UserProfile = {
      avatarUrl: info.avatar_url,
      displayName: info.displayname,
      pronouns: info['io.fsky.nyx.pronouns'],
      timezone: info['us.cloke.msc4175.tz'] || info['m.tz'],
      bio: info['moe.sable.app.bio'] || info['chat.commet.profile_bio'],
      bannerUrl: info['chat.commet.profile_banner'],
      extended: {},
    };

    const knownKeys = [
      'avatar_url',
      'displayname',
      'io.fsky.nyx.pronouns',
      'us.cloke.msc4175.tz', 'm.tz',
      'moe.sable.app.bio', 'chat.commet.profile_bio',
      'chat.commet.profile_banner'
    ];

    Object.keys(info).forEach((key) => {
      if (!knownKeys.includes(key)) {
        normalized.extended![key] = info[key];
      }
    });

    return normalized;
  }, []);

  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = mx.getUser(userId);
    const cached = globalProfiles[userId];
    return {
      avatarUrl: cached?.avatarUrl ?? initialProfile?.avatarUrl ?? user?.avatarUrl,
      displayName: cached?.displayName ?? initialProfile?.displayName ?? user?.displayName,
      pronouns: cached?.pronouns ?? initialProfile?.pronouns,
      timezone: cached?.timezone ?? initialProfile?.timezone,
      bio: cached?.bio ?? initialProfile?.bio,
      extended: cached?.extended ?? initialProfile?.extended,
    };
  });

  useEffect(() => {
    const user = mx.getUser(userId);

    mx.getProfileInfo(userId).then((info: any) => {
      const normalized = normalizeInfo(info);
      setProfile(normalized);
      setGlobalProfiles((prev) => ({ ...prev, [userId]: normalized }));
    });

    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({ ...cp, avatarUrl: myUser.avatarUrl }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({ ...cp, displayName: myUser.displayName }));
    };

    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);

    return () => {
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId, normalizeInfo, setGlobalProfiles]);

  return profile;
};