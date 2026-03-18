import { Box, Chip, Spinner, Text, color, config } from 'folds';
import { MessageBase, CompactPlaceholder, DefaultPlaceholder } from '$components/message';

export type PaginationStatus = 'idle' | 'loading' | 'error';

export interface PaginationLoaderProps {
  status: PaginationStatus;
  direction: 'backward' | 'forward';
  isCompact: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  observerRef?: (node: HTMLElement | null) => void;
}

export function PaginationLoader({
  status,
  direction,
  isCompact,
  isEmpty,
  onRetry,
  observerRef,
}: PaginationLoaderProps) {
  if (status === 'error') {
    return (
      <Box
        justifyContent="Center"
        alignItems="Center"
        gap="200"
        style={{ padding: config.space.S300 }}
      >
        <Text style={{ color: color.Critical.Main }} size="T300">
          {direction === 'backward' ? 'Failed to load history.' : 'Failed to load messages.'}
        </Text>
        <Chip variant="SurfaceVariant" radii="Pill" outlined onClick={onRetry}>
          <Text size="B300">Retry</Text>
        </Chip>
      </Box>
    );
  }

  if (isEmpty) {
    const count = isCompact ? 5 : 3;
    const anchorIndex = direction === 'backward' ? count - 1 : 0;
    const skeletonKeys = Array.from({ length: count }, (_, idx) => `skeleton-${direction}-${idx}`);

    return (
      <>
        {skeletonKeys.map((skeletonKey, i) => {
          const attachRef = i === anchorIndex ? observerRef : undefined;
          return (
            <MessageBase key={skeletonKey} ref={attachRef}>
              {isCompact ? <CompactPlaceholder /> : <DefaultPlaceholder />}
            </MessageBase>
          );
        })}
      </>
    );
  }

  return (
    <Box style={{ position: 'relative', width: '100%', height: '60px', overflowAnchor: 'none' }}>
      <div
        ref={observerRef}
        style={{
          position: 'absolute',
          [direction === 'backward' ? 'top' : 'bottom']: 0,
          width: '100%',
          height: '1px',
        }}
      />

      {status === 'loading' && (
        <Box justifyContent="Center" alignItems="Center" style={{ position: 'absolute', inset: 0 }}>
          <Spinner variant="Secondary" size="400" />
        </Box>
      )}
    </Box>
  );
}
