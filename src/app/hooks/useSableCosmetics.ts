import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { EventTimeline, Room } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { StateEvent } from '../../types/matrix/room';
import { usePowerLevels } from './usePowerLevels';
import { useRoomCreators } from './useRoomCreators';
import { useAccessiblePowerTagColors, useGetMemberPowerTag } from './useMemberPowerTag'; // Added useMemberPowerTag
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';
import colorMXID from '../../util/colorMXID';
import { useRoomCreatorsTag } from './useRoomCreatorsTag';
import { usePowerLevelTags } from './usePowerLevelTags';
import { useTheme } from './useTheme';
import { useUserProfile } from './useUserProfile';

const isValidHex = (c: string) => /^#[0-9A-F]{6}$/i.test(c);
const sanitizeFont = (f: string) => f.replace(/[;{}<>]/g, '').slice(0, 32);

export function useSableCosmetics(userId: string, room: Room) {
    const mx = useMatrixClient();
    const theme = useTheme();

    const profile = useUserProfile(userId);

    const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');
    const [renderGlobalColors] = useSetting(settingsAtom, 'renderGlobalNameColors');

    const powerLevels = usePowerLevels(room);
    const creators = useRoomCreators(room);

    const creatorsTag = useRoomCreatorsTag();
    const powerLevelTags = usePowerLevelTags(room, powerLevels);
    const getPowerTag = useGetMemberPowerTag(room, creators, powerLevels);

    const accessibleTagColors = useAccessiblePowerTagColors(
        theme.kind,
        creatorsTag,
        powerLevelTags
    );

    return useMemo(() => {
        if (!room || !userId) return { color: undefined, font: undefined };

        // fetch room/space states

        const localColor = room?.getLiveTimeline()
            .getState(EventTimeline.FORWARDS)
            ?.getStateEvents(StateEvent.RoomCosmeticsColor, userId)
            ?.getContent()?.color;

        const localFont = room?.getLiveTimeline()
            .getState(EventTimeline.FORWARDS)
            ?.getStateEvents(StateEvent.RoomCosmeticsFont, userId)
            ?.getContent()?.font;

        const parents = room?.getLiveTimeline()
            .getState(EventTimeline.FORWARDS)
            ?.getStateEvents(StateEvent.SpaceParent);

        let spaceColor;
        let spaceFont;

        // get space variables if applicable

        if (parents && parents.length > 0) {
            const parentSpaceId = parents[0].getStateKey();
            const parentSpace = mx.getRoom(parentSpaceId);

            spaceColor = parentSpace?.getLiveTimeline()
                .getState(EventTimeline.FORWARDS)
                ?.getStateEvents(StateEvent.RoomCosmeticsColor, userId)
                ?.getContent()?.color;

            spaceFont = parentSpace?.getLiveTimeline()
                .getState(EventTimeline.FORWARDS)
                ?.getStateEvents(StateEvent.RoomCosmeticsFont, userId)
                ?.getContent()?.font;
        }

        // global name color
        // show if its on, or the user is you
        const hasGlobalColor = profile?.nameColor && isValidHex(profile.nameColor);
        const isMe = userId === mx.getUserId();
        const validGlobal = (renderGlobalColors || isMe) && hasGlobalColor
            ? profile.nameColor
            : undefined;

        // resolve traditional fallbacks
        const memberPowerTag = getPowerTag(userId);
        const tagColor = memberPowerTag?.color ? accessibleTagColors?.get(memberPowerTag.color) : undefined;

        // final resolutions
        const validLocal = localColor && isValidHex(localColor) ? localColor : undefined;
        const validSpace = spaceColor && isValidHex(spaceColor) ? spaceColor : undefined;

        // color decision hierarchy
        // Room > Space > Global (if enabled) > Random Colors (if enabled) > Tag
        const resolvedColor = validLocal || validSpace || validGlobal || (legacyUsernameColor ? colorMXID(userId) : tagColor);

        // font decision hierarchy
        const rawFont = localFont || spaceFont;
        let resolvedFont;
        if (rawFont) {
            const clean = sanitizeFont(rawFont);
            resolvedFont = clean.includes(' ') ? `"${clean}", var(--font-secondary)` : `${clean}, var(--font-secondary)`;
        }

        return { color: resolvedColor, font: resolvedFont };
    }, [room, userId, mx, getPowerTag, accessibleTagColors, legacyUsernameColor, renderGlobalColors, profile.nameColor]);
}