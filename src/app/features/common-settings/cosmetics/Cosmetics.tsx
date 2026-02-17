import React, { useCallback } from 'react';
import {
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Scroll,
  Switch,
} from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useRoom } from '../../../hooks/useRoom';
import { usePowerLevels } from '../../../hooks/usePowerLevels';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { StateEvent } from '../../../../types/matrix/room';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';

type CosmeticsProps = {
  requestClose: () => void;
};

export function Cosmetics({ requestClose }: CosmeticsProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  const creators = useRoomCreators(room);
  const powerLevels = usePowerLevels(room);
  const isSpace = room.isSpaceRoom();

  const permissions = useRoomPermissions(creators, powerLevels);
  const canEditPermissions = permissions.stateEvent(StateEvent.RoomPowerLevels, mx.getSafeUserId());

  const currentLevel = (powerLevels as any).events?.[StateEvent.RoomCosmeticsColor] ?? 50;

  const handleToggle = useCallback(async (enabled: boolean) => {
    const newLevel = enabled ? 0 : 50;

    const newContent = {
      ...powerLevels,
      events: {
        ...((powerLevels as any).events || {}),
        [StateEvent.RoomCosmeticsColor]: newLevel,
      },
    };

    try {
      await mx.sendStateEvent(room.roomId, StateEvent.RoomPowerLevels as any, newContent, "");
    } catch (e) {
      console.error("Failed to update cosmetic permissions:", e);
    }
  }, [mx, room.roomId, powerLevels]);

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Cosmetics
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box direction="Column" gap="100">
                <Text size="L400">Settings</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={isSpace ? "Space-Wide Colors" : "Room Colors"}
                    description={
                      isSpace
                        ? "Allow everyone to use the /gcolor command to set their global identity for this Space."
                        : "Allow everyone to use the /color command to set a unique color for this room."
                    }
                    after={
                      <Switch
                        variant="Primary"
                        value={currentLevel === 0}
                        onChange={handleToggle}
                        disabled={!canEditPermissions}
                      />
                    }
                  />
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}