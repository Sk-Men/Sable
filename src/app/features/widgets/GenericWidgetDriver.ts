import {
  type Capability,
  type ISendDelayedEventDetails,
  type ISendEventDetails,
  type IReadEventRelationsResult,
  type IRoomEvent,
  type Widget,
  WidgetDriver,
  WidgetKind,
  type IWidgetApiErrorResponseDataDetails,
  type ISearchUserDirectoryResult,
  type IGetMediaConfigResult,
  UpdateDelayedEventAction,
  OpenIDRequestState,
  SimpleObservable,
  IOpenIDUpdate,
} from 'matrix-widget-api';
import {
  EventType,
  type IContent,
  MatrixError,
  type MatrixEvent,
  Direction,
  type SendDelayedEventResponse,
  type StateEvents,
  type TimelineEvents,
  MatrixClient,
  Room,
} from '$types/matrix-sdk';

export type CapabilityApprovalCallback = (requested: Set<Capability>) => Promise<Set<Capability>>;

// Unlike SmallWidgetDriver which auto-grants all capabilities for Element Call,
// this driver provides a capability approval mechanism for untrusted widgets.
export class GenericWidgetDriver extends WidgetDriver {
  private readonly mxClient: MatrixClient;

  private readonly approveCapabilities: CapabilityApprovalCallback;

  public constructor(
    mx: MatrixClient,
    private forWidget: Widget,
    private forWidgetKind: WidgetKind,
    private inRoomId?: string,
    approveCapabilities?: CapabilityApprovalCallback
  ) {
    super();
    this.mxClient = mx;
    this.approveCapabilities = approveCapabilities ?? (async (caps) => caps);
  }

  public async validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
    return this.approveCapabilities(requested);
  }

  public async sendEvent<K extends keyof StateEvents>(
    eventType: K,
    content: StateEvents[K],
    stateKey: string | null,
    targetRoomId: string | null
  ): Promise<ISendEventDetails>;

  public async sendEvent<K extends keyof TimelineEvents>(
    eventType: K,
    content: TimelineEvents[K],
    stateKey: null,
    targetRoomId: string | null
  ): Promise<ISendEventDetails>;

  public async sendEvent(
    eventType: string,
    content: IContent,
    stateKey: string | null = null,
    targetRoomId: string | null = null
  ): Promise<ISendEventDetails> {
    const client = this.mxClient;
    const roomId = targetRoomId || this.inRoomId;
    if (!client || !roomId) throw new Error('Not in a room or not attached to a client');

    let r: { event_id: string } | null;
    if (stateKey !== null) {
      r = await client.sendStateEvent(
        roomId,
        eventType as keyof StateEvents,
        content as StateEvents[keyof StateEvents],
        stateKey
      );
    } else if (eventType === EventType.RoomRedaction) {
      r = await client.redactEvent(roomId, content.redacts);
    } else {
      r = await client.sendEvent(
        roomId,
        eventType as keyof TimelineEvents,
        content as TimelineEvents[keyof TimelineEvents]
      );
    }
    return { roomId, eventId: r.event_id };
  }

  public async sendDelayedEvent<K extends keyof StateEvents>(
    delay: number | null,
    parentDelayId: string | null,
    eventType: K,
    content: StateEvents[K],
    stateKey: string | null,
    targetRoomId: string | null
  ): Promise<ISendDelayedEventDetails>;

  public async sendDelayedEvent<K extends keyof TimelineEvents>(
    delay: number | null,
    parentDelayId: string | null,
    eventType: K,
    content: TimelineEvents[K],
    stateKey: null,
    targetRoomId: string | null
  ): Promise<ISendDelayedEventDetails>;

  public async sendDelayedEvent(
    delay: number | null,
    parentDelayId: string | null,
    eventType: string,
    content: IContent,
    stateKey: string | null = null,
    targetRoomId: string | null = null
  ): Promise<ISendDelayedEventDetails> {
    const client = this.mxClient;
    const roomId = targetRoomId || this.inRoomId;
    if (!client || !roomId) throw new Error('Not in a room or not attached to a client');

    let delayOpts;
    if (delay !== null) {
      delayOpts = { delay, ...(parentDelayId !== null && { parent_delay_id: parentDelayId }) };
    } else if (parentDelayId !== null) {
      delayOpts = { parent_delay_id: parentDelayId };
    } else {
      throw new Error('Must provide at least one of delay or parentDelayId');
    }

    let r: SendDelayedEventResponse | null;
    if (stateKey !== null) {
      r = await client._unstable_sendDelayedStateEvent(
        roomId,
        delayOpts,
        eventType as keyof StateEvents,
        content as StateEvents[keyof StateEvents],
        stateKey
      );
    } else {
      r = await client._unstable_sendDelayedEvent(
        roomId,
        delayOpts,
        null,
        eventType as keyof TimelineEvents,
        content as TimelineEvents[keyof TimelineEvents]
      );
    }
    return { roomId, delayId: r.delay_id };
  }

  public async updateDelayedEvent(
    delayId: string,
    action: UpdateDelayedEventAction
  ): Promise<void> {
    await this.mxClient._unstable_updateDelayedEvent(delayId, action);
  }

  public async sendToDevice(
    eventType: string,
    encrypted: boolean,
    contentMap: Record<string, Record<string, object>>
  ): Promise<void> {
    const client = this.mxClient;
    if (encrypted) {
      const crypto = client.getCrypto();
      if (!crypto) throw new Error('E2EE not enabled');
      const invertedContentMap: Record<string, { userId: string; deviceId: string }[]> = {};
      for (const userId of Object.keys(contentMap)) {
        for (const deviceId of Object.keys(contentMap[userId])) {
          const key = JSON.stringify(contentMap[userId][deviceId]);
          invertedContentMap[key] = invertedContentMap[key] || [];
          invertedContentMap[key].push({ userId, deviceId });
        }
      }
      await Promise.all(
        Object.entries(invertedContentMap).map(async ([str, recipients]) => {
          const batch = await crypto.encryptToDeviceMessages(
            eventType,
            recipients,
            JSON.parse(str)
          );
          await client.queueToDevice(batch);
        })
      );
    } else {
      await client.queueToDevice({
        eventType,
        batch: Object.entries(contentMap).flatMap(([userId, userContentMap]) =>
          Object.entries(userContentMap).map(([deviceId, content]) => ({
            userId,
            deviceId,
            payload: content,
          }))
        ),
      });
    }
  }

  public async readRoomTimeline(
    roomId: string,
    eventType: string,
    msgtype: string | undefined,
    stateKey: string | undefined,
    limit: number,
    since: string | undefined
  ): Promise<IRoomEvent[]> {
    limit = limit > 0 ? Math.min(limit, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    const room = this.mxClient.getRoom(roomId);
    if (!room) return [];
    const results: MatrixEvent[] = [];
    const events = room.getLiveTimeline().getEvents();
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (results.length >= limit) break;
      if (since !== undefined && ev.getId() === since) break;
      if (ev.getType() !== eventType || ev.isState()) continue;
      if (eventType === EventType.RoomMessage && msgtype && msgtype !== ev.getContent().msgtype)
        continue;
      if (ev.getStateKey() !== undefined && stateKey !== undefined && ev.getStateKey() !== stateKey)
        continue;
      results.push(ev);
    }
    return results.map((e) => e.getEffectiveEvent() as IRoomEvent);
  }

  public async askOpenID(observer: SimpleObservable<IOpenIDUpdate>): Promise<void> {
    return observer.update({
      state: OpenIDRequestState.Allowed,
      token: await this.mxClient.getOpenIdToken(),
    });
  }

  public async readRoomState(
    roomId: string,
    eventType: string,
    stateKey: string | undefined
  ): Promise<IRoomEvent[]> {
    const room = this.mxClient.getRoom(roomId);
    if (!room) return [];
    const state = room.getLiveTimeline().getState(Direction.Forward);
    if (!state) return [];
    if (stateKey === undefined)
      return state
        .getStateEvents(eventType)
        .map((e: MatrixEvent) => e.getEffectiveEvent() as IRoomEvent);
    const event = state.getStateEvents(eventType, stateKey);
    return event === null ? [] : [event.getEffectiveEvent() as IRoomEvent];
  }

  public async readEventRelations(
    eventId: string,
    roomId?: string,
    relationType?: string,
    eventType?: string,
    from?: string,
    to?: string,
    limit?: number,
    direction?: 'f' | 'b'
  ): Promise<IReadEventRelationsResult> {
    roomId = roomId ?? this.inRoomId ?? undefined;
    if (typeof roomId !== 'string') throw new Error('Error while reading the current room');
    const { events, nextBatch, prevBatch } = await this.mxClient.relations(
      roomId,
      eventId,
      relationType ?? null,
      eventType ?? null,
      { from, to, limit, dir: direction as Direction }
    );
    return {
      chunk: events.map((e: MatrixEvent) => e.getEffectiveEvent() as IRoomEvent),
      nextBatch: nextBatch ?? undefined,
      prevBatch: prevBatch ?? undefined,
    };
  }

  public async searchUserDirectory(
    searchTerm: string,
    limit?: number
  ): Promise<ISearchUserDirectoryResult> {
    const { limited, results } = await this.mxClient.searchUserDirectory({
      term: searchTerm,
      limit,
    });
    return {
      limited,
      results: results.map((r: any) => ({
        userId: r.user_id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
      })),
    };
  }

  public async getMediaConfig(): Promise<IGetMediaConfigResult> {
    return this.mxClient.getMediaConfig();
  }

  public async uploadFile(file: XMLHttpRequestBodyInit): Promise<{ contentUri: string }> {
    const uploadResult = await this.mxClient.uploadContent(file);
    return { contentUri: uploadResult.content_uri };
  }

  public getKnownRooms(): string[] {
    return this.mxClient.getVisibleRooms().map((r: Room) => r.roomId);
  }

  public processError(error: unknown): IWidgetApiErrorResponseDataDetails | undefined {
    return error instanceof MatrixError
      ? { matrix_api_error: (error as any).asWidgetApiErrorData() }
      : undefined;
  }
}
