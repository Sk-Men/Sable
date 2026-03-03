import { useEffect, useState } from 'react';
import { Box, Text } from 'folds';
import { SequenceCard } from '$components/sequence-card';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useClientConfig } from '$hooks/useClientConfig';
import { getClientSyncDiagnostics } from '$client/initMatrix';
import { Direction, Room } from '$types/matrix-sdk';
import { Membership } from '$types/matrix/room';
import { SequenceCardStyle } from '$features/settings/styles.css';

type RoomRenderingDiagnostics = {
  totalRooms: number;
  joinedRooms: number;
  inviteRooms: number;
  roomsMissingName: number;
  roomsMissingAvatar: number;
  roomsWithoutLiveEvents: number;
  roomsWithBackPagination: number;
};

const getRoomRenderingDiagnostics = (rooms: Room[]): RoomRenderingDiagnostics => {
  let joinedRooms = 0;
  let inviteRooms = 0;
  let roomsMissingName = 0;
  let roomsMissingAvatar = 0;
  let roomsWithoutLiveEvents = 0;
  let roomsWithBackPagination = 0;

  rooms.forEach((room) => {
    const membership = room.getMyMembership();
    if (membership === Membership.Join) joinedRooms += 1;
    if (membership === Membership.Invite) inviteRooms += 1;

    if (!room.name || room.name.trim().length === 0) roomsMissingName += 1;

    const roomAvatar = room.getMxcAvatarUrl();
    const fallbackAvatar = room.getAvatarFallbackMember()?.getMxcAvatarUrl();
    if (!roomAvatar && !fallbackAvatar) roomsMissingAvatar += 1;

    const liveTimeline = room.getLiveTimeline();
    if (liveTimeline.getEvents().length === 0) roomsWithoutLiveEvents += 1;
    if (liveTimeline.getPaginationToken(Direction.Backward)) roomsWithBackPagination += 1;
  });

  return {
    totalRooms: rooms.length,
    joinedRooms,
    inviteRooms,
    roomsMissingName,
    roomsMissingAvatar,
    roomsWithoutLiveEvents,
    roomsWithBackPagination,
  };
};

const formatListCoverage = (knownCount: number, rangeEnd: number): string => {
  if (knownCount <= 0) return '0/0';
  const loadedCount = Math.max(0, Math.min(knownCount, rangeEnd + 1));
  return `${loadedCount}/${knownCount}`;
};

export function SyncDiagnostics() {
  const mx = useMatrixClient();
  const clientConfig = useClientConfig();
  const [, setTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const diagnostics = getClientSyncDiagnostics(mx);
  const roomDiagnostics = getRoomRenderingDiagnostics(mx.getRooms());

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Sync Diagnostics</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="100"
      >
        <Box direction="Column" gap="100" style={{ padding: '12px' }}>
          <Text size="T300">
            Transport: {diagnostics.transport}
            {diagnostics.fallbackFromSliding ? ' (fallback)' : ''}
          </Text>
          <Text size="T300">State: {diagnostics.syncState ?? 'null'}</Text>
          <Text size="T300">
            Sliding configured: {clientConfig.slidingSync?.enabled ? 'yes' : 'no'}
          </Text>
          <Text size="T300">
            Room counts: {roomDiagnostics.totalRooms} total, {roomDiagnostics.joinedRooms} joined,{' '}
            {roomDiagnostics.inviteRooms} invites
          </Text>
          <Text size="T300">Rooms missing name: {roomDiagnostics.roomsMissingName}</Text>
          <Text size="T300">Rooms missing avatar: {roomDiagnostics.roomsMissingAvatar}</Text>
          <Text size="T300">
            Rooms without live events: {roomDiagnostics.roomsWithoutLiveEvents}
          </Text>
          <Text size="T300">
            Rooms with more history to paginate: {roomDiagnostics.roomsWithBackPagination}
          </Text>

          {diagnostics.sliding && (
            <>
              <Text size="T300">Sliding proxy: {diagnostics.sliding.proxyBaseUrl}</Text>
              {diagnostics.sliding.lists.map((list) => (
                <Text size="T300" key={list.key}>
                  List `{list.key}` coverage: {formatListCoverage(list.knownCount, list.rangeEnd)}
                </Text>
              ))}
            </>
          )}
        </Box>
      </SequenceCard>
    </Box>
  );
}
