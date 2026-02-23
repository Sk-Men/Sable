import { useEffect, useState } from 'react';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;

  pronouns?: any[]; // io.fsky.nyx.pronouns
  timezone?: string; // us.cloke.msc4175.tz
  bio?: string; // moe.sable.app.bio
  extended?: Record<string, any>; // any other fields
};

export const useUserProfile = (userId: string): UserProfile => {
  const mx = useMatrixClient();

  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = mx.getUser(userId);
    return {
      avatarUrl: user?.avatarUrl,
      displayName: user?.displayName,
    };
  });

  useEffect(() => {
    const user = mx.getUser(userId);
    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatarUrl: myUser.avatarUrl,
      }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        displayName: myUser.displayName,
      }));
    };

    mx.getProfileInfo(userId).then((info: any) => {
      const normalized: UserProfile = {
        avatarUrl: info.avatar_url,
        displayName: info.displayname,
        pronouns: info['io.fsky.nyx.pronouns'],
        timezone: info['us.cloke.msc4175.tz'] || info['m.tz'],
        bio: info['moe.sable.app.bio'],
        extended: {},
      };

      const knownKeys = [
        'avatar_url',
        'displayname',
        'io.fsky.nyx.pronouns',
        'us.cloke.msc4175.tz',
        'm.tz',
        'moe.sable.app.bio'
      ];
      Object.keys(info).forEach((key) => {
        if (!knownKeys.includes(key)) {
          normalized.extended![key] = info[key];
        }
      });

      setProfile(normalized);
    });

    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);

    return () => {
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId]);

  return profile;
};
