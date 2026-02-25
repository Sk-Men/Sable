import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { EventTimeline, Room } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { profilesCacheAtom } from '../state/userRoomProfile';
import { StateEvent } from '../../types/matrix/room';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';
import colorMXID from '../../util/colorMXID';

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

const isValidHex = (c: string) => /^#[0-9A-F]{6}$/i.test(c);
const sanitizeFont = (f: string) => f.replace(/[;{}<>]/g, '').slice(0, 32);

export const useUserProfile = (
  userId: string,
  room?: Room,
  initialProfile?: Partial<UserProfile>
): UserProfile & { resolvedColor?: string; resolvedFont?: string } => {
  const mx = useMatrixClient();
  const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');
  const [renderGlobalColors] = useSetting(settingsAtom, 'renderGlobalNameColors');

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
      setGlobalProfiles((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], ...normalized }
      }));
    }).catch(() => {
      setGlobalProfiles((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], _fetched: true }
      }));
    });
    return () => { isMounted = false; };
  }, [userId, needsFetch, mx, setGlobalProfiles]);

  return useMemo(() => {
    const data = cached ?? {
      displayName: initialProfile?.displayName ?? mx.getUser(userId)?.displayName,
      avatarUrl: initialProfile?.avatarUrl ?? mx.getUser(userId)?.avatarUrl,
      ...initialProfile,
    };

    let localColor;
    let localFont;
    let spaceColor;
    let spaceFont;

    if (room) {
      const state = room.getLiveTimeline().getState(EventTimeline.FORWARDS);

      // Safely get local cosmetics
      const localEvent = state?.getStateEvents(StateEvent.RoomCosmeticsColor, userId);
      // If userId is provided, Matrix returns a single event. If it's an array, we take the first.
      localColor = (Array.isArray(localEvent) ? localEvent[0] : localEvent)?.getContent()?.color;

      const localFontEvent = state?.getStateEvents(StateEvent.RoomCosmeticsFont, userId);
      localFont = (Array.isArray(localFontEvent) ? localFontEvent[0] : localFontEvent)?.getContent()?.font;

      const parents = state?.getStateEvents(StateEvent.SpaceParent);
      if (parents && parents.length > 0) {
        const parentSpace = mx.getRoom(parents[0].getStateKey());
        const pState = parentSpace?.getLiveTimeline().getState(EventTimeline.FORWARDS);

        const spaceEvent = pState?.getStateEvents(StateEvent.RoomCosmeticsColor, userId);
        spaceColor = (Array.isArray(spaceEvent) ? spaceEvent[0] : spaceEvent)?.getContent()?.color;

        const spaceFontEvent = pState?.getStateEvents(StateEvent.RoomCosmeticsFont, userId);
        spaceFont = (Array.isArray(spaceFontEvent) ? spaceFontEvent[0] : spaceFontEvent)?.getContent()?.font;
      }
    }

    const hasGlobalColor = data?.nameColor && isValidHex(data.nameColor);
    const validGlobal = (renderGlobalColors || userId === mx.getUserId()) && hasGlobalColor ? data.nameColor : undefined;
    const validLocal = localColor && isValidHex(localColor) ? localColor : undefined;
    const validSpace = spaceColor && isValidHex(spaceColor) ? spaceColor : undefined;

    const resolvedColor = validLocal || validSpace || validGlobal || (legacyUsernameColor ? colorMXID(userId) : undefined);

    const rawFont = localFont || spaceFont;
    let resolvedFont;
    if (rawFont) {
      const clean = sanitizeFont(rawFont);
      resolvedFont = clean.includes(' ') ? `"${clean}", var(--font-secondary)` : `${clean}, var(--font-secondary)`;
    }

    return { ...data, resolvedColor, resolvedFont };
  }, [cached, userId, room, mx, legacyUsernameColor, renderGlobalColors, initialProfile]);
};