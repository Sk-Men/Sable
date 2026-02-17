import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import * as css from './styles.css';
import { UserAvatar } from '../user-avatar';
import colorMXID from '../../../util/colorMXID';
import { getMxIdLocalPart } from '../../utils/matrix';
import { BreakWord, LineClamp3 } from '../../styles/Text.css';
import { UserPresence } from '../../hooks/useUserPresence';
import { AvatarPresence, PresenceBadge } from '../presence';
import { ImageViewer } from '../image-viewer';
import { stopPropagation } from '../../utils/keyboard';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { EventTimeline, EventTimelineSet } from 'matrix-js-sdk';
import { StateEvent } from '../../../types/matrix/room';

type UserHeroProps = {
  userId: string;
  avatarUrl?: string;
  presence?: UserPresence;
};
export function UserHero({ userId, avatarUrl, presence }: UserHeroProps) {
  const [viewAvatar, setViewAvatar] = useState<string>();

  return (
    <Box direction="Column" className={css.UserHero}>
      <div
        className={css.UserHeroCoverContainer}
        style={{
          backgroundColor: colorMXID(userId),
          filter: avatarUrl ? undefined : 'brightness(50%)',
        }}
      >
        {avatarUrl && (
          <img className={css.UserHeroCover} src={avatarUrl} alt={userId} draggable="false" />
        )}
      </div>
      <div className={css.UserHeroAvatarContainer}>
        <AvatarPresence
          className={css.UserAvatarContainer}
          badge={
            presence && <PresenceBadge presence={presence.presence} status={presence.status} />
          }
        >
          <Avatar
            as={avatarUrl ? 'button' : 'div'}
            onClick={avatarUrl ? () => setViewAvatar(avatarUrl) : undefined}
            className={css.UserHeroAvatar}
            size="500"
          >
            <UserAvatar
              className={css.UserHeroAvatarImg}
              userId={userId}
              src={avatarUrl}
              alt={userId}
              renderFallback={() => <Icon size="500" src={Icons.User} filled />}
            />
          </Avatar>
        </AvatarPresence>
        {viewAvatar && (
          <Overlay open backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setViewAvatar(undefined),
                  clickOutsideDeactivates: true,
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Modal size="500" onContextMenu={(evt: any) => evt.stopPropagation()}>
                  <ImageViewer
                    src={viewAvatar}
                    alt={userId}
                    requestClose={() => setViewAvatar(undefined)}
                  />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
      </div>
    </Box>
  );
}

type UserHeroNameProps = {
  displayName?: string;
  userId: string;
};
export function UserHeroName({ displayName, userId }: UserHeroNameProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  const username = getMxIdLocalPart(userId);

  // Sable cosmetic username colors and fonts
  const isValidHex = (c: string) => /^#[0-9A-F]{6}$/i.test(c)
  const sanitizeFont = (f: string) => f.replace(/[;{}<>]/g, '').slice(0, 32);

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

  const validLocalColor = localColor && isValidHex(localColor) ? localColor : undefined;
  const validSpaceColor = spaceColor && isValidHex(spaceColor) ? spaceColor : undefined;

  const usernameColor = validLocalColor || validSpaceColor;

  const rawFont = localFont || spaceFont;
  let usernameFont: string | undefined;

  if (rawFont) {
    const cleanFont = sanitizeFont(rawFont);
    // leave quotes off of single words, otherwise monospace or sans-serif dont work
    usernameFont = cleanFont.includes(' ')
      ? `"${cleanFont}", var(--font-secondary)`
      : `${cleanFont}, var(--font-secondary)`;
  }

  return (
    <Box grow="Yes" direction="Column" gap="0">
      <Box alignItems="Baseline" gap="200" wrap="Wrap">
        <Text
          size="H4"
          className={classNames(BreakWord, LineClamp3)}
          title={displayName ?? username}
          style={{
            color: usernameColor,
            fontFamily: usernameFont
          }}
        >
          {displayName ?? username ?? userId}
        </Text>
      </Box>
      <Box alignItems="Center" gap="100" wrap="Wrap">
        <Text size="T200" className={classNames(BreakWord, LineClamp3)} title={username}>
          @{username}
        </Text>
      </Box>
    </Box>
  );
}
