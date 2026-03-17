/**
 * Unit tests for SlidingSyncManager memory management:
 *
 * 1. dispose() — must call slidingSync.stop() to halt the polling loop and
 *    abort in-flight requests. Without this the SDK's Promise loop keeps
 *    running after the client is "stopped", leaking network traffic and
 *    event listeners.
 *
 * 2. pruneRoomTimeline (via unsubscribeFromRoom) — when a room transitions
 *    from active to background, its in-memory event chain is released if it
 *    exceeds PRUNE_TIMELINE_THRESHOLD. Sliding sync does not persist timeline
 *    events to IndexedDB, so the pruned events are gone from memory. On next
 *    open the active-room subscription re-fetches the latest events from the
 *    server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlidingSyncManager, type SlidingSyncConfig } from './slidingSync';

// ── vi.hoisted mocks ─────────────────────────────────────────────────────────
// Must be defined via vi.hoisted so they're available before vi.mock runs
// (vi.mock calls are hoisted above all imports by vitest's transformer).
const mocks = vi.hoisted(() => ({
  slidingSyncInstance: {
    on: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
    stop: vi.fn(),
    modifyRoomSubscriptions: vi.fn(),
    modifyRoomSubscriptionInfo: vi.fn(),
    addCustomSubscription: vi.fn(),
    useCustomSubscription: vi.fn(),
    registerExtension: vi.fn(),
    getListData: vi.fn(() => null),
    getListParams: vi.fn(() => null),
    setList: vi.fn(),
    setListRanges: vi.fn(),
  },
}));

// ── Sentry stub ──────────────────────────────────────────────────────────────
vi.mock('@sentry/react', () => ({
  metrics: { count: vi.fn(), gauge: vi.fn(), distribution: vi.fn() },
  addBreadcrumb: vi.fn(),
  startInactiveSpan: vi.fn(() => ({
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    end: vi.fn(),
  })),
  startSpan: vi.fn(async (_opts: unknown, fn: (span: object) => unknown) =>
    fn({ setAttributes: vi.fn(), setAttribute: vi.fn(), end: vi.fn() })
  ),
}));

// ── SlidingSync SDK mock ─────────────────────────────────────────────────────
// vi.fn() wrappers are arrow functions internally and cannot be called with `new`.
// A plain function constructor (returning an object) is the correct pattern.
vi.mock('$types/matrix-sdk', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  function MockSlidingSync() {
    return mocks.slidingSyncInstance;
  }
  return { ...actual, SlidingSync: MockSlidingSync };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMockMx(overrides: Record<string, unknown> = {}) {
  return {
    getUserId: vi.fn().mockReturnValue('@user:example.com'),
    getSafeUserId: vi.fn().mockReturnValue('@user:example.com'),
    isRoomEncrypted: vi.fn().mockReturnValue(false),
    getRoom: vi.fn().mockReturnValue(null),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
  } as unknown as import('$types/matrix-sdk').MatrixClient;
}

function makeMockRoom(eventCount: number) {
  const events = Array.from({ length: eventCount }, (_, i) => ({ getId: () => `$ev${i}` }));
  const resetLiveTimeline = vi.fn();
  return {
    getUnfilteredTimelineSet: vi.fn().mockReturnValue({
      getLiveTimeline: vi.fn().mockReturnValue({ getEvents: vi.fn().mockReturnValue(events) }),
      resetLiveTimeline,
    }),
    _resetLiveTimeline: resetLiveTimeline,
  };
}

function makeManager(mx: ReturnType<typeof makeMockMx>): SlidingSyncManager {
  const config: SlidingSyncConfig = {};
  return new SlidingSyncManager(mx, 'https://sliding.example.com', config);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── dispose() ────────────────────────────────────────────────────────────────

describe('SlidingSyncManager.dispose()', () => {
  it('calls slidingSync.stop() to halt the polling loop', () => {
    const manager = makeManager(makeMockMx());
    manager.dispose();
    expect(mocks.slidingSyncInstance.stop).toHaveBeenCalledOnce();
  });
});

// ── pruneRoomTimeline (exercised via unsubscribeFromRoom) ────────────────────

// This value must match PRUNE_TIMELINE_THRESHOLD in slidingSync.ts.
const PRUNE_THRESHOLD = 150;

describe('SlidingSyncManager — timeline pruning on unsubscribe', () => {
  it('resets the live timeline when event count exceeds the threshold', () => {
    const room = makeMockRoom(PRUNE_THRESHOLD + 1);
    const mx = makeMockMx({ getRoom: vi.fn().mockReturnValue(room) });
    const manager = makeManager(mx);

    manager.unsubscribeFromRoom('!room:example.com');

    expect(room._resetLiveTimeline).toHaveBeenCalledOnce();
  });

  it('does not reset when event count equals the threshold exactly', () => {
    const room = makeMockRoom(PRUNE_THRESHOLD);
    const mx = makeMockMx({ getRoom: vi.fn().mockReturnValue(room) });
    const manager = makeManager(mx);

    manager.unsubscribeFromRoom('!room:example.com');

    expect(room._resetLiveTimeline).not.toHaveBeenCalled();
  });

  it('does not reset for rooms with very few events', () => {
    const room = makeMockRoom(5);
    const mx = makeMockMx({ getRoom: vi.fn().mockReturnValue(room) });
    const manager = makeManager(mx);

    manager.unsubscribeFromRoom('!room:example.com');

    expect(room._resetLiveTimeline).not.toHaveBeenCalled();
  });

  it('does not throw when the room is not yet in SDK state', () => {
    const mx = makeMockMx({ getRoom: vi.fn().mockReturnValue(null) });
    const manager = makeManager(mx);

    expect(() => manager.unsubscribeFromRoom('!room:example.com')).not.toThrow();
  });
});
