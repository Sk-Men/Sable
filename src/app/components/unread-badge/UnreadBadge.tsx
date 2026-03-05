import { CSSProperties, ReactNode } from 'react';
import { Box, Badge, toRem, Text } from 'folds';
import { millify } from '$plugins/millify';
import { useSetting } from '$state/hooks/settings';
import { settingsAtom } from '$state/settings';

type UnreadBadgeProps = {
  highlight?: boolean;
  count: number;
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

export function UnreadBadge({ highlight, count }: UnreadBadgeProps) {
  const [showCounts] = useSetting(settingsAtom, 'showUnreadCounts');
  const showNumber = showCounts && count > 0;
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
