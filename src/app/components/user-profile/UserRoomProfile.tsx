import { Box, Button, config, Icon, Icons, Scroll, Text } from 'folds';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { HTMLReactParserOptions } from 'html-react-parser';
import { UserHero, UserHeroName } from './UserHero';
import { getMxIdServer, mxcUrlToHttp } from '../../utils/matrix';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useUserPresence } from '../../hooks/useUserPresence';
import { IgnoredUserAlert, MutualRoomsChip, OptionsChip, ServerChip, ShareChip } from './UserChips';
import { useCloseUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { PowerChip } from './PowerChip';
import { UserInviteAlert, UserBanAlert, UserModeration, UserKickAlert } from './UserModeration';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { useMembership } from '../../hooks/useMembership';
import { Membership } from '../../../types/matrix/room';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMemberPowerCompare } from '../../hooks/useMemberPowerCompare';
import { CreatorChip } from './CreatorChip';
import { getDirectCreatePath, withSearchParam } from '../../pages/pathUtils';
import { DirectCreateSearchParams } from '../../pages/paths';
import { nicknamesAtom } from '../../state/nicknames';
import { UserProfile, useUserProfile } from '../../hooks/useUserProfile';
import { RenderBody } from '../message';
import { factoryRenderLinkifyWithMention, getReactCustomHtmlParser, LINKIFY_OPTS, makeMentionCustomProps, renderMatrixMention } from '../../plugins/react-custom-html-parser';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { userRoomProfileAtom } from '../../state/userRoomProfile';

type UserExtendedSectionProps = {
  profile: UserProfile;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: LinkifyOpts;
};

function UserExtendedSection({ profile, htmlReactParserOptions, linkifyOpts }: UserExtendedSectionProps) {
  const clamp = (str: string, len: number) => str.length > len ? `${str.slice(0, len)}...` : str;
  const [showMore, setShowMore] = useState(false);

  const pronouns = profile.pronouns?.map((p: any) => clamp(p.summary, 20)).join("/");
  const timezone = profile.timezone ? clamp(profile.timezone, 64) : null;
  const localTime = timezone ? new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date()) : null;

  const bioContent = useMemo(() => {
    const rawBio = profile.extended?.["moe.sable.app.bio"] || profile.extended?.["chat.commet.profile_bio"] || profile.bio;
    if (!rawBio) return null;

    const safetyTrim = rawBio.length > 2048 ? rawBio.slice(0, 2048) : rawBio;

    const visibleText = safetyTrim.replace(/<[^>]*>?/gm, '');
    const VISIBLE_LIMIT = 1024;

    if (visibleText.length <= VISIBLE_LIMIT) return safetyTrim;

    return safetyTrim;
  }, [profile]);

  const unknownFields = Object.entries(profile.extended || {}).filter(([, value]) =>
    typeof value === 'string' || typeof value === 'number');

  return (
    <Box direction="Column" gap="200" style={{ marginBottom: config.space.S100 }}>
      {(pronouns || localTime) && (
        <Box alignItems="Center" gap="300" wrap="Wrap">
          {pronouns && (
            <Box alignItems="Center" gap="100">
              <Icon size="50" src={Icons.User} style={{ opacity: 0.5 }} />
              <Text size="T200" priority="400">{pronouns}</Text>
            </Box>
          )}
          {localTime && (
            <Box alignItems="Center" gap="100">
              <Icon size="50" src={Icons.Clock} style={{ opacity: 0.5 }} />
              <Text size="T200" priority="400">{localTime} ({profile.timezone})</Text>
            </Box>
          )}
        </Box>
      )}

      {bioContent && (
        <Scroll
          direction="Vertical"
          variant="SurfaceVariant"
          visibility="Always"
          size="300"
          style={{
            backgroundColor: 'var(--sable-bg-container)',
            borderRadius: config.radii.R400,
            maxHeight: '200px',
            marginTop: config.space.S0,
          }}
        >
          <Box style={{ padding: config.space.S200, wordBreak: 'break-word' }}>
            <Text size="T200" priority="400" as="div">
              <RenderBody
                body={bioContent}
                customBody={bioContent}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
              />
            </Text>
          </Box>
        </Scroll>
      )}

      {unknownFields.length > 0 && (
        <Box direction="Column" gap="100">
          <Button
            variant="Secondary"
            size="300"
            fill="None"
            onClick={() => setShowMore(!showMore)}
            after={<Icon size="50" src={showMore ? Icons.ChevronTop : Icons.ChevronBottom} />}
            style={{ padding: '1rem', justifyContent: 'flex-start', width: 'fit-content' }}
          >
            <Text size="T200" priority="400">{showMore ? "Show less" : `+ ${unknownFields.length} more info`}</Text>
          </Button>

          {showMore && (
            <Box direction="Column" style={{ padding: config.space.S200, backgroundColor: 'var(--sable-surface-container)', borderRadius: config.radii.R400 }}>
              {unknownFields.map(([key, value]) => (
                <Box key={key} direction="Column" style={{ marginBottom: config.space.S100 }}>
                  <Text size="T200" priority="400" style={{ letterSpacing: '0.05em' }}>
                    {clamp(key, 64).split('.').pop()?.replace(/_/g, ' ')}
                  </Text>
                  <Text size="T200" priority="300">{String(clamp(value, 64))}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}


type UserRoomProfileProps = {
  userId: string;
};
export function UserRoomProfile({ userId }: UserRoomProfileProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const navigate = useNavigate();
  const closeUserRoomProfile = useCloseUserRoomProfile();
  const ignoredUsers = useIgnoredUsers();
  const ignored = ignoredUsers.includes(userId);

  const room = useRoom();
  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const { hasMorePower } = useMemberPowerCompare(creators, powerLevels);

  const myUserId = mx.getSafeUserId();
  const creator = creators.has(userId);

  const canKickUser = permissions.action('kick', myUserId) && hasMorePower(myUserId, userId);
  const canBanUser = permissions.action('ban', myUserId) && hasMorePower(myUserId, userId);
  const canUnban = permissions.action('ban', myUserId);
  const canInvite = permissions.action('invite', myUserId);

  const member = room.getMember(userId);
  const membership = useMembership(room, userId);

  const server = getMxIdServer(userId);
  const nicknames = useAtomValue(nicknamesAtom);
  const displayName = getMemberDisplayName(room, userId, nicknames);
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = (avatarMxc && mxcUrlToHttp(mx, avatarMxc, useAuthentication)) ?? undefined;

  const presence = useUserPresence(userId);

  const extendedProfile = useUserProfile(userId);

  const handleMessage = () => {
    closeUserRoomProfile();
    const directSearchParam: DirectCreateSearchParams = {
      userId,
    };
    navigate(withSearchParam(getDirectCreatePath(), directSearchParam));
  };

  // Todo eventually maybe
  const mentionClickHandler = useCallback((e: React.SyntheticEvent<HTMLElement>) => {
    e.preventDefault();
  }, []);

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(mx, room.roomId, href, makeMentionCustomProps(mentionClickHandler), nicknames)
      ),
    }),
    [mx, room, mentionClickHandler, nicknames]
  );

  const spoilerClickHandler = useSpoilerClickHandler();

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room.roomId, {
        linkifyOpts,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
      }),
    [mx, room, linkifyOpts, useAuthentication, spoilerClickHandler]
  );

  return (
    <Box direction="Column">
      <UserHero
        userId={userId}
        avatarUrl={avatarUrl}
        presence={presence && presence.lastActiveTs !== 0 ? presence : undefined}
      />
      <Box direction="Column" gap="300" style={{ padding: config.space.S400 }}>
        <Box direction="Column" gap="200">
          <Box gap="200" alignItems="Center" wrap="Wrap">
            <UserHeroName displayName={displayName} userId={userId} />
            {userId !== myUserId && (
              <Button
                size="300"
                variant="Primary"
                fill="Solid"
                radii="300"
                before={<Icon size="50" src={Icons.Message} filled />}
                onClick={handleMessage}
                style={{ marginLeft: 'auto' }}
              >
                <Text size="B300">Message</Text>
              </Button>
            )}
          </Box>
          <UserExtendedSection
            profile={extendedProfile}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
          <Box alignItems="Center" gap="100" wrap="Wrap">
            {server && <ServerChip server={server} />}
            <ShareChip userId={userId} />
            {creator ? <CreatorChip /> : <PowerChip userId={userId} />}
            {userId !== myUserId && <MutualRoomsChip userId={userId} />}
            {userId !== myUserId && <OptionsChip userId={userId} />}
          </Box>
        </Box>
        {ignored && <IgnoredUserAlert />}
        {member && membership === Membership.Ban && (
          <UserBanAlert
            userId={userId}
            reason={member.events.member?.getContent().reason}
            canUnban={canUnban}
            bannedBy={member.events.member?.getSender()}
            ts={member.events.member?.getTs()}
          />
        )}
        {member &&
          membership === Membership.Leave &&
          member.events.member &&
          member.events.member.getSender() !== userId && (
            <UserKickAlert
              reason={member.events.member?.getContent().reason}
              kickedBy={member.events.member?.getSender()}
              ts={member.events.member?.getTs()}
            />
          )}
        {member && membership === Membership.Invite && (
          <UserInviteAlert
            userId={userId}
            reason={member.events.member?.getContent().reason}
            canKick={canKickUser}
            invitedBy={member.events.member?.getSender()}
            ts={member.events.member?.getTs()}
          />
        )}
        <UserModeration
          userId={userId}
          canInvite={canInvite && membership === Membership.Leave}
          canKick={canKickUser && membership === Membership.Join}
          canBan={canBanUser && membership !== Membership.Ban}
        />
      </Box>
    </Box>
  );
}