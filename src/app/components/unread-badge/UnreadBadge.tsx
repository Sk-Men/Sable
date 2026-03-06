import { CSSProperties, ReactNode } from 'react';
import { Box, Badge, toRem, Text } from 'folds';
import { millify } from '$plugins/millify';
import { useSetting } from '$state/hooks/settings';
import { settingsAtom } from '$state/settings';

type UnreadBadgeProps = {
  highlight?: boolean;
  count: number;
  /** Whether this badge belongs to a DM room. Used with the badgeCountDMsOnly setting. */
  dm?: boolean;
};
const styles: CSSProperties = {
  minWidth: toRem(16),
};
export function UnreadBadgeCenter({ children }: { children: ReactNode }) {
  return (
    <Box as="span" style={styles} shrink="No" alignItems="Center" justifyContent="Center">
      {children}
    </Box>
  );
}

export function UnreadBadge({ highlight, count, dm }: UnreadBadgeProps) {
  const [showUnreadCounts] = useSetting(settingsAtom, 'showUnreadCounts');
  const [badgeCountDMsOnly] = useSetting(settingsAtom, 'badgeCountDMsOnly');
  const [showPingCounts] = useSetting(settingsAtom, 'showPingCounts');

  // Show count when: (showUnreadCounts OR highlight+showPingCounts) AND (not DM-only mode OR this is a DM)
  const showNumber =
    count > 0 && (showUnreadCounts || (highlight && showPingCounts)) && (!badgeCountDMsOnly || dm);

  return (
    <Badge
      variant={highlight ? 'Success' : 'Secondary'}
      size={showNumber ? '400' : '200'}
      fill="Solid"
      radii="Pill"
      outlined={false}
    >
      {showNumber && (
        <Text as="span" size="L400">
          {millify(count)}
        </Text>
      )}
    </Badge>
  );
}
