import classNames from 'classnames';
import {
  Avatar,
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  Scroll,
  Text,
  as,
  config,
} from 'folds';
import { MatrixEvent, Room } from '$types/matrix-sdk';
import { getMemberDisplayName } from '$utils/room';
import { getMxIdLocalPart } from '$utils/matrix';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '$state/hooks/userRoomProfile';
import { useSpaceOptionally } from '$hooks/useSpace';
import { getMouseEventCords } from '$utils/dom';
import { useAtomValue } from 'jotai';
import { nicknamesAtom } from '$state/nicknames';
import { UserAvatar } from '$components/user-avatar';
import { Time } from '$components/message';
import { useSetting } from '$state/hooks/settings';
import { settingsAtom } from '$state/settings';
import * as css from './EventHistory.css';

export type EventHistoryProps = {
  room: Room;
  mEvents: MatrixEvent[];
  requestClose: () => void;
};
export const EventHistory = as<'div', EventHistoryProps>(
  ({ className, room, mEvents, requestClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const openProfile = useOpenUserRoomProfile();
    const space = useSpaceOptionally();
    const nicknames = useAtomValue(nicknamesAtom);

    const getName = (userId: string) =>
      getMemberDisplayName(room, userId, nicknames) ?? getMxIdLocalPart(userId) ?? userId;

    const readerId = mEvents[0].event.sender ?? '';
    const name = getName(readerId ?? '');
    const avatarMxcUrl = room.getMember(readerId ?? '')?.getMxcAvatarUrl();
    const avatarUrl = avatarMxcUrl
      ? mx.mxcUrlToHttp(avatarMxcUrl, 100, 100, 'crop', undefined, false, useAuthentication)
      : undefined;

    const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
    const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

    return (
      <Box
        className={classNames(css.EventHistory, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.Header} variant="Surface" size="600">
          <Box grow="Yes">
            <Text size="H3">Message version history</Text>
          </Box>
          <IconButton size="300" onClick={requestClose}>
            <Icon src={Icons.Cross} />
          </IconButton>
        </Header>
        <Header>
          <MenuItem
            key={readerId}
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: `0 ${config.space.S200}`,
            }}
            radii="400"
            onClick={(event) => {
              openProfile(
                room.roomId,
                space?.roomId,
                readerId,
                getMouseEventCords(event.nativeEvent),
                'Bottom'
              );
            }}
            before={
              <Avatar size="300">
                <UserAvatar
                  userId={readerId ?? ''}
                  src={avatarUrl ?? undefined}
                  alt={name}
                  renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                />
              </Avatar>
            }
          >
            <Text size="T400">{name}</Text>
          </MenuItem>
        </Header>
        <Box grow="Yes">
          <Scroll visibility="Hover">
            <Box className={css.Content} direction="Column">
              {mEvents.map((mEvent) => {
                if (!mEvent.event.sender) return <div />;

                return (
                  <MenuItem
                    key={readerId}
                    style={{ padding: `0 ${config.space.S200}` }}
                    radii="400"
                    before={
                      <Time
                        ts={mEvent.getTs()}
                        hour24Clock={hour24Clock}
                        dateFormatString={dateFormatString}
                      />
                    }
                  >
                    <Text size="T400">
                      {mEvent?.event?.content?.['m.new_content']?.body ??
                        mEvent.event?.content?.body ??
                        ''}
                    </Text>
                  </MenuItem>
                );
              })}
            </Box>
          </Scroll>
        </Box>
      </Box>
    );
  }
);
