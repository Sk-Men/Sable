import {
  MatrixClient,
  MSC3575List,
  MSC3575RoomSubscription,
  SlidingSync,
  SlidingSyncEvent,
  SlidingSyncState,
  MSC3575_STATE_KEY_LAZY,
  MSC3575_STATE_KEY_ME,
  EventType,
} from '$types/matrix-sdk';
import { StateEvent } from '$types/matrix/room';
import { createLogger } from '$utils/debug';

const log = createLogger('slidingSync');

const LIST_JOINED = 'joined';
const LIST_INVITES = 'invites';
const DEFAULT_LIST_PAGE_SIZE = 50;
const DEFAULT_TIMELINE_LIMIT = 30;
const TIMELINE_LIMIT_LOW = 10;
const TIMELINE_LIMIT_MEDIUM = 15;
const TIMELINE_LIMIT_HIGH = 30;
const DEFAULT_POLL_TIMEOUT_MS = 30000;
const DEFAULT_MAX_ROOMS = 5000;

export type SlidingSyncConfig = {
  enabled?: boolean;
  proxyBaseUrl?: string;
  listPageSize?: number;
  timelineLimit?: number;
  pollTimeoutMs?: number;
  maxRooms?: number;
  includeInviteList?: boolean;
  probeTimeoutMs?: number;
};

export type SlidingSyncListDiagnostics = {
  key: string;
  knownCount: number;
  rangeEnd: number;
};

export type SlidingSyncDeviceDiagnostics = {
  saveData: boolean;
  effectiveType: string | null;
  deviceMemoryGb: number | null;
};

export type SlidingSyncDiagnostics = {
  proxyBaseUrl: string;
  timelineLimit: number;
  listPageSize: number;
  adaptiveTimeline: boolean;
  device: SlidingSyncDeviceDiagnostics;
  lists: SlidingSyncListDiagnostics[];
};

const clampPositive = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return fallback;
  return Math.round(value);
};

const resolveAdaptiveTimelineLimit = (
  configuredLimit: number | undefined,
  pageSize: number
): number => {
  if (typeof configuredLimit === 'number' && configuredLimit > 0) {
    return clampPositive(configuredLimit, DEFAULT_TIMELINE_LIMIT);
  }

  const navigatorLike = typeof navigator !== 'undefined' ? navigator : undefined;
  const connection = (navigatorLike as any)?.connection;
  const saveData = connection?.saveData === true;
  const effectiveType = connection?.effectiveType as string | undefined;
  const deviceMemory = (navigatorLike as any)?.deviceMemory as number | undefined;

  if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
    return Math.min(pageSize, TIMELINE_LIMIT_LOW);
  }

  if (effectiveType === '3g' || (typeof deviceMemory === 'number' && deviceMemory <= 4)) {
    return Math.min(pageSize, TIMELINE_LIMIT_MEDIUM);
  }

  return Math.min(pageSize, TIMELINE_LIMIT_HIGH);
};

const getDeviceDiagnostics = (): SlidingSyncDeviceDiagnostics => {
  const navigatorLike = typeof navigator !== 'undefined' ? navigator : undefined;
  const connection = (navigatorLike as any)?.connection;
  const effectiveType = connection?.effectiveType;
  const deviceMemory = (navigatorLike as any)?.deviceMemory;

  return {
    saveData: connection?.saveData === true,
    effectiveType: typeof effectiveType === 'string' ? effectiveType : null,
    deviceMemoryGb: typeof deviceMemory === 'number' ? deviceMemory : null,
  };
};

const buildDefaultSubscription = (timelineLimit: number): MSC3575RoomSubscription => ({
  timeline_limit: timelineLimit,
  required_state: [
    [EventType.RoomMember, MSC3575_STATE_KEY_ME],
    [EventType.RoomMember, MSC3575_STATE_KEY_LAZY],
    [EventType.RoomCreate, ''],
    [EventType.RoomName, ''],
    [EventType.RoomAvatar, ''],
    [EventType.RoomCanonicalAlias, ''],
    [EventType.RoomEncryption, ''],
    [EventType.RoomTombstone, ''],
    [EventType.RoomJoinRules, ''],
    [EventType.RoomHistoryVisibility, ''],
    [StateEvent.PoniesRoomEmotes, '*'],
    [StateEvent.RoomWidget, '*'],
    [StateEvent.GroupCallPrefix, '*'],
    [EventType.SpaceChild, '*'],
    [EventType.SpaceParent, '*'],
  ],
});

const buildLists = (
  pageSize: number,
  timelineLimit: number,
  includeInviteList: boolean,
  requiredState: MSC3575RoomSubscription['required_state']
): Map<string, MSC3575List> => {
  const lists = new Map<string, MSC3575List>();
  lists.set(LIST_JOINED, {
    ranges: [[0, Math.max(0, pageSize - 1)]],
    timeline_limit: timelineLimit,
    required_state: requiredState,
    slow_get_all_rooms: true,
    filters: {
      is_invite: false,
    },
  });

  if (includeInviteList) {
    lists.set(LIST_INVITES, {
      ranges: [[0, Math.max(0, pageSize - 1)]],
      timeline_limit: timelineLimit,
      required_state: requiredState,
      slow_get_all_rooms: true,
      filters: {
        is_invite: true,
      },
    });
  }

  return lists;
};

const getListEndIndex = (list: MSC3575List | null): number => {
  if (!list?.ranges?.length) return -1;
  return list.ranges.reduce((max, range) => Math.max(max, range[1] ?? -1), -1);
};

export class SlidingSyncManager {
  private disposed = false;

  private readonly maxRooms: number;

  private readonly listKeys: string[];
  private readonly timelineLimit: number;
  private readonly listPageSize: number;
  private readonly adaptiveTimeline: boolean;
  private readonly deviceDiagnostics: SlidingSyncDeviceDiagnostics;

  private readonly onLifecycle: (state: SlidingSyncState, resp: unknown, err?: Error) => void;

  public readonly slidingSync: SlidingSync;

  public readonly probeTimeoutMs: number;

  public constructor(
    private readonly mx: MatrixClient,
    private readonly proxyBaseUrl: string,
    config: SlidingSyncConfig
  ) {
    const listPageSize = clampPositive(config.listPageSize, DEFAULT_LIST_PAGE_SIZE);
    const adaptiveTimeline = !(typeof config.timelineLimit === 'number' && config.timelineLimit > 0);
    const timelineLimit = resolveAdaptiveTimelineLimit(config.timelineLimit, listPageSize);
    const pollTimeoutMs = clampPositive(config.pollTimeoutMs, DEFAULT_POLL_TIMEOUT_MS);
    this.probeTimeoutMs = clampPositive(config.probeTimeoutMs, 5000);
    this.maxRooms = clampPositive(config.maxRooms, DEFAULT_MAX_ROOMS);
    this.timelineLimit = timelineLimit;
    this.listPageSize = listPageSize;
    this.adaptiveTimeline = adaptiveTimeline;
    this.deviceDiagnostics = getDeviceDiagnostics();
    const includeInviteList = config.includeInviteList !== false;

    const subscription = buildDefaultSubscription(timelineLimit);
    const lists = buildLists(
      listPageSize,
      timelineLimit,
      includeInviteList,
      subscription.required_state
    );
    this.listKeys = Array.from(lists.keys());
    this.slidingSync = new SlidingSync(proxyBaseUrl, lists, subscription, mx, pollTimeoutMs);

    this.onLifecycle = (state, resp, err) => {
      if (this.disposed || err || !resp || state !== SlidingSyncState.Complete) return;
      this.expandListsToKnownCount();
    };
  }

  public attach(): void {
    this.slidingSync.on(SlidingSyncEvent.Lifecycle, this.onLifecycle);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.slidingSync.removeListener(SlidingSyncEvent.Lifecycle, this.onLifecycle);
  }

  public getDiagnostics(): SlidingSyncDiagnostics {
    return {
      proxyBaseUrl: this.proxyBaseUrl,
      timelineLimit: this.timelineLimit,
      listPageSize: this.listPageSize,
      adaptiveTimeline: this.adaptiveTimeline,
      device: this.deviceDiagnostics,
      lists: this.listKeys.map((key) => {
        const listData = this.slidingSync.getListData(key);
        const params = this.slidingSync.getListParams(key);
        return {
          key,
          knownCount: listData?.joinedCount ?? 0,
          rangeEnd: getListEndIndex(params),
        };
      }),
    };
  }

  private expandListsToKnownCount(): void {
    this.listKeys.forEach((key) => {
      const listData = this.slidingSync.getListData(key);
      const knownCount = listData?.joinedCount ?? 0;
      if (knownCount <= 0) return;

      const desiredEnd = Math.min(knownCount, this.maxRooms) - 1;
      const existing = this.slidingSync.getListParams(key);
      const currentEnd = getListEndIndex(existing);
      if (desiredEnd === currentEnd) return;

      this.slidingSync.setListRanges(key, [[0, desiredEnd]]);
      if (knownCount > this.maxRooms) {
        log.warn(
          `Sliding Sync list "${key}" capped at ${this.maxRooms}/${knownCount} rooms for ${this.mx.getUserId()}`
        );
      }
    });
  }

  public static async probe(
    mx: MatrixClient,
    proxyBaseUrl: string,
    probeTimeoutMs: number
  ): Promise<boolean> {
    try {
      const response = await mx.slidingSync(
        {
          lists: {
            probe: {
              ranges: [[0, 0]],
              timeline_limit: 1,
              required_state: [],
            },
          },
          timeout: 0,
          clientTimeout: probeTimeoutMs,
        },
        proxyBaseUrl
      );

      return typeof response.pos === 'string' && response.pos.length > 0;
    } catch {
      return false;
    }
  }
}
