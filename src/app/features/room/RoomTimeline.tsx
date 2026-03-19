import { Fragment, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from 'slate';
import { useAtomValue, useSetAtom } from 'jotai';
import { PushProcessor, Room, Direction } from '$types/matrix-sdk';
import classNames from 'classnames';
import {
  as,
  Box,
  Chip,
  Icon,
  Icons,
  Line,
  Scroll,
  Text,
  Badge,
  color,
  config,
  toRem,
  ContainerColor,
} from 'folds';
import { MessageBase } from '$components/message';
import { RoomIntro } from '$components/room-intro';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { useVirtualPaginator } from '$hooks/useVirtualPaginator';
import { useDocumentFocusChange } from '$hooks/useDocumentFocusChange';
import { markAsRead } from '$utils/notifications';
import {
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
  factoryRenderLinkifyWithMention,
} from '$plugins/react-custom-html-parser';
import { today, yesterday, timeDayMonthYear } from '$utils/time';
import { useMemberEventParser } from '$hooks/useMemberEventParser';
import { usePowerLevelsContext } from '$hooks/usePowerLevels';
import { useRoomCreators } from '$hooks/useRoomCreators';
import { useRoomPermissions } from '$hooks/useRoomPermissions';
import { useGetMemberPowerTag } from '$hooks/useMemberPowerTag';
import { useRoomNavigate } from '$hooks/useRoomNavigate';
import { useMentionClickHandler } from '$hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '$hooks/useSpoilerClickHandler';
import { useOpenUserRoomProfile } from '$state/hooks/userRoomProfile';
import { useSpaceOptionally } from '$hooks/useSpace';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useIgnoredUsers } from '$hooks/useIgnoredUsers';
import { useImagePackRooms } from '$hooks/useImagePackRooms';
import { settingsAtom, MessageLayout } from '$state/settings';
import { useSetting } from '$state/hooks/settings';
import { nicknamesAtom } from '$state/nicknames';
import { profilesCacheAtom } from '$state/userRoomProfile';
import { roomToParentsAtom } from '$state/room/roomToParents';
import { roomIdToReplyDraftAtomFamily } from '$state/room/roomInputDrafts';
import { roomIdToOpenThreadAtomFamily } from '$state/room/roomToOpenThread';
import {
  getRoomUnreadInfo,
  getEventTimeline,
  getFirstLinkedTimeline,
  getInitialTimeline,
  PAGINATION_LIMIT,
  getEventIdAbsoluteIndex,
} from '$utils/timeline';
import { useScrollManager } from '$hooks/useScrollManager';
import { useTimelineSync } from '$hooks/timeline/useTimelineSync';
import { useTimelineActions } from '$hooks/timeline/useTimelineActions';
import { useProcessedTimeline } from '$hooks/timeline/useProcessedTimeline';
import { useTimelineEventRenderer } from '$hooks/timeline/useTimelineEventRenderer';
import { PaginationLoader } from '$components/PaginationPlaceholders';
import * as css from './RoomTimeline.css';

const TimelineFloat = as<'div', css.TimelineFloatVariants>(
  ({ position, className, ...props }, ref) => (
    <Box
      className={classNames(css.TimelineFloat({ position }), className)}
      justifyContent="Center"
      alignItems="Center"
      gap="200"
      {...props}
      ref={ref}
    />
  )
);

const TimelineDivider = as<'div', { variant?: ContainerColor | 'Inherit' }>(
  ({ variant, children, ...props }, ref) => (
    <Box gap="100" justifyContent="Center" alignItems="Center" {...props} ref={ref}>
      <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
      {children}
      <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
    </Box>
  )
);

const getDayDividerText = (ts: number) => {
  if (today(ts)) return 'Today';
  if (yesterday(ts)) return 'Yesterday';
  return timeDayMonthYear(ts);
};

export type RoomTimelineProps = {
  room: Room;
  eventId?: string;
  editor: Editor;
  onEditorReset?: () => void;
};

export function RoomTimeline({
  room,
  eventId,
  editor,
  onEditorReset,
}: Readonly<RoomTimelineProps>) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const { navigateRoom } = useRoomNavigate();

  const [hideReads] = useSetting(settingsAtom, 'hideReads');
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [hideMembershipEvents] = useSetting(settingsAtom, 'hideMembershipEvents');
  const [hideNickAvatarEvents] = useSetting(settingsAtom, 'hideNickAvatarEvents');
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const [showHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
  const [showTombstoneEvents] = useSetting(settingsAtom, 'showTombstoneEvents');
  const [showDeveloperTools] = useSetting(settingsAtom, 'developerTools');
  const [reducedMotion] = useSetting(settingsAtom, 'reducedMotion');
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');
  const [autoplayStickers] = useSetting(settingsAtom, 'autoplayStickers');
  const [autoplayEmojis] = useSetting(settingsAtom, 'autoplayEmojis');
  const [hideMemberInReadOnly] = useSetting(settingsAtom, 'hideMembershipInReadOnly');

  const showUrlPreview = room.hasEncryptionStateEvent() ? encUrlPreview : urlPreview;

  const nicknames = useAtomValue(nicknamesAtom);
  const globalProfiles = useAtomValue(profilesCacheAtom);
  const ignoredUsersList = useIgnoredUsers();
  const ignoredUsersSet = useMemo(() => new Set(ignoredUsersList), [ignoredUsersList]);

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const getMemberPowerTag = useGetMemberPowerTag(room, creators, powerLevels);
  const permissions = useRoomPermissions(creators, powerLevels);
  const isReadOnly = useMemo(() => {
    const myPowerLevel = powerLevels?.users?.[mx.getUserId()!] ?? powerLevels?.users_default ?? 0;
    const sendLevel = powerLevels?.events?.['m.room.message'] ?? powerLevels?.events_default ?? 0;
    return myPowerLevel < sendLevel;
  }, [powerLevels, mx]);

  const [editId, setEditId] = useState<string>();
  const [unreadInfo, setUnreadInfo] = useState(() => getRoomUnreadInfo(room, true));

  const readUptoEventIdRef = useRef<string | undefined>(undefined);
  if (unreadInfo) readUptoEventIdRef.current = unreadInfo.readUptoEventId;
  const hideReadsRef = useRef(hideReads);
  hideReadsRef.current = hideReads;

  const mediaAuthentication = useMediaAuthentication();
  const spoilerClickHandler = useSpoilerClickHandler();
  const mentionClickHandler = useMentionClickHandler(room.roomId);
  const openUserRoomProfile = useOpenUserRoomProfile();
  const optionalSpace = useSpaceOptionally();
  const roomParents = useAtomValue(roomToParentsAtom);
  const imagePackRooms = useImagePackRooms(room.roomId, roomParents);
  const pushProcessor = useMemo(() => new PushProcessor(mx), [mx]);
  const parseMemberEvent = useMemberEventParser();

  const replyDraftAtom = useMemo(() => roomIdToReplyDraftAtomFamily(room.roomId), [room.roomId]);
  const activeReplyDraft = useAtomValue(replyDraftAtom);
  const setReplyDraft = useSetAtom(replyDraftAtom);
  const activeReplyId = activeReplyDraft?.eventId;

  const openThreadAtom = useMemo(() => roomIdToOpenThreadAtomFamily(room.roomId), [room.roomId]);
  const openThreadId = useAtomValue(openThreadAtom);
  const setOpenThread = useSetAtom(openThreadAtom);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const { isAtBottom, onScroll, scrollToBottom, sentryRef } = useScrollManager(scrollRef);

  const timelineSync = useTimelineSync({
    room,
    mx,
    eventId,
    isAtBottom,
    scrollToBottom,
    unreadInfo,
    setUnreadInfo,
    hideReadsRef,
    readUptoEventIdRef,
  });

  const virtualPaginator = useVirtualPaginator({
    count: timelineSync.eventsLength,
    limit: PAGINATION_LIMIT,
    range: timelineSync.timeline.range,
    onRangeChange: useCallback(
      (newRange) => {
        timelineSync.setTimeline((ct) => {
          const deltaStart = Math.abs(ct.range.start - newRange.start);
          const deltaEnd = Math.abs(ct.range.end - newRange.end);
          if (deltaStart < 3 && deltaEnd < 3) return ct;
          return { ...ct, range: newRange };
        });
      },
      [timelineSync]
    ),
    getScrollElement: useCallback(() => scrollRef.current, []),
    getItemElement: useCallback(
      (index: number) =>
        (scrollRef.current?.querySelector(`[data-message-item="${index}"]`) as HTMLElement) ??
        undefined,
      []
    ),
    onEnd: timelineSync.handleTimelinePagination,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timelineSync.focusItem) {
      if (timelineSync.focusItem.scrollTo) {
        virtualPaginator.scrollToItem(timelineSync.focusItem.index, {
          behavior: reducedMotion ? 'instant' : 'smooth',
          align: 'center',
          stopInView: true,
        });
        timelineSync.setFocusItem((prev) => (prev ? { ...prev, scrollTo: false } : undefined));
      }
      timeoutId = setTimeout(() => {
        timelineSync.setFocusItem(undefined);
      }, 2000);
    }
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [timelineSync.focusItem, virtualPaginator, timelineSync, reducedMotion]);

  useEffect(() => {
    if (eventId) return;

    const { readUptoEventId, inLiveTimeline, scrollTo } = unreadInfo ?? {};
    if (readUptoEventId && inLiveTimeline && scrollTo) {
      const evtTimeline = getEventTimeline(room, readUptoEventId);
      const absoluteIndex = evtTimeline
        ? getEventIdAbsoluteIndex(
            timelineSync.timeline.linkedTimelines,
            evtTimeline,
            readUptoEventId
          )
        : undefined;

      if (absoluteIndex !== undefined) {
        virtualPaginator.scrollToItem(absoluteIndex, {
          behavior: 'instant',
          align: 'start',
          stopInView: true,
        });
        setUnreadInfo((prev) => (prev ? { ...prev, scrollTo: false } : prev));
      }
    }
  }, [room, unreadInfo, timelineSync.timeline.linkedTimelines, virtualPaginator, eventId]);

  const actions = useTimelineActions({
    room,
    mx,
    editor,
    alive,
    nicknames,
    globalProfiles,
    spaceId: optionalSpace?.roomId,
    openUserRoomProfile,
    activeReplyId,
    setReplyDraft,
    openThreadId,
    setOpenThread,
    setEditId,
    onEditorReset,
    handleOpenEvent: (id) => {
      const evtTimeline = getEventTimeline(room, id);
      const absoluteIndex = evtTimeline
        ? getEventIdAbsoluteIndex(timelineSync.timeline.linkedTimelines, evtTimeline, id)
        : undefined;

      if (typeof absoluteIndex === 'number') {
        virtualPaginator.scrollToItem(absoluteIndex, {
          behavior: reducedMotion ? 'instant' : 'smooth',
          align: 'center',
          stopInView: true,
        });
        timelineSync.setFocusItem({ index: absoluteIndex, scrollTo: false, highlight: true });
      } else {
        timelineSync.loadEventTimeline(id);
      }
    },
  });

  const processedEvents = useProcessedTimeline({
    items: virtualPaginator.getItems(),
    linkedTimelines: timelineSync.timeline.linkedTimelines,
    ignoredUsersSet,
    showHiddenEvents,
    showTombstoneEvents,
    mxUserId: mx.getUserId(),
    readUptoEventId: readUptoEventIdRef.current,
  });

  const linkifyOpts = useMemo(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(
          mx,
          room.roomId,
          href,
          makeMentionCustomProps(mentionClickHandler),
          nicknames
        )
      ),
    }),
    [mx, room.roomId, mentionClickHandler, nicknames]
  );

  const htmlReactParserOptions = useMemo(
    () =>
      getReactCustomHtmlParser(mx, room.roomId, {
        linkifyOpts,
        useAuthentication: mediaAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
        nicknames,
        autoplayEmojis,
      }),
    [
      mx,
      room.roomId,
      linkifyOpts,
      autoplayEmojis,
      mentionClickHandler,
      nicknames,
      mediaAuthentication,
      spoilerClickHandler,
    ]
  );

  const renderMatrixEvent = useTimelineEventRenderer({
    room,
    mx,
    pushProcessor,
    nicknames,
    imagePackRooms,
    settings: {
      messageLayout,
      messageSpacing,
      hideReads,
      showDeveloperTools,
      hour24Clock,
      dateFormatString,
      mediaAutoLoad,
      showUrlPreview,
      autoplayStickers,
      hideMemberInReadOnly,
      isReadOnly,
      hideMembershipEvents,
      hideNickAvatarEvents,
      showHiddenEvents,
    },
    state: { focusItem: timelineSync.focusItem, editId, activeReplyId, openThreadId },
    permissions: {
      canRedact: permissions.action('redact', mx.getSafeUserId()),
      canDeleteOwn: permissions.event('m.room.redaction', mx.getSafeUserId()),
      canSendReaction: permissions.event('m.reaction', mx.getSafeUserId()),
      canPinEvent: permissions.stateEvent('m.room.pinned_events', mx.getSafeUserId()),
    },
    callbacks: {
      onUserClick: actions.handleUserClick,
      onUsernameClick: actions.handleUsernameClick,
      onReplyClick: actions.handleReplyClick,
      onReactionToggle: actions.handleReactionToggle,
      onEditId: actions.handleEdit,
      onResend: actions.handleResend,
      onDeleteFailedSend: actions.handleDeleteFailedSend,
      setOpenThread: actions.setOpenThread,
      handleOpenReply: actions.handleOpenReply,
    },
    utils: { htmlReactParserOptions, linkifyOpts, getMemberPowerTag, parseMemberEvent },
  });

  const tryAutoMarkAsRead = useCallback(() => {
    if (!readUptoEventIdRef.current) {
      requestAnimationFrame(() => markAsRead(mx, room.roomId, hideReads));
      return;
    }
    const evtTimeline = getEventTimeline(room, readUptoEventIdRef.current);
    const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
    if (latestTimeline === room.getLiveTimeline()) {
      requestAnimationFrame(() => markAsRead(mx, room.roomId, hideReads));
    }
  }, [mx, room, hideReads]);

  useDocumentFocusChange(
    useCallback(
      (inFocus) => {
        if (inFocus && isAtBottom) tryAutoMarkAsRead();
      },
      [tryAutoMarkAsRead, isAtBottom]
    )
  );

  useEffect(() => {
    if (
      isAtBottom &&
      document.hasFocus() &&
      timelineSync.liveTimelineLinked &&
      timelineSync.rangeAtEnd
    ) {
      tryAutoMarkAsRead();
    }
  }, [isAtBottom, timelineSync.liveTimelineLinked, timelineSync.rangeAtEnd, tryAutoMarkAsRead]);

  return (
    <Box grow="Yes" style={{ position: 'relative' }}>
      {unreadInfo?.readUptoEventId && !unreadInfo?.inLiveTimeline && (
        <TimelineFloat position="Top">
          <Chip
            variant="Primary"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.MessageUnread} />}
            onClick={() => timelineSync.loadEventTimeline(unreadInfo.readUptoEventId)}
          >
            <Text size="L400">Jump to Unread</Text>
          </Chip>
          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.CheckTwice} />}
            onClick={() => markAsRead(mx, room.roomId, hideReads)}
          >
            <Text size="L400">Mark as Read</Text>
          </Chip>
        </TimelineFloat>
      )}

      <Scroll ref={scrollRef} visibility="Hover" onScroll={onScroll}>
        <Box
          ref={messageListRef}
          className={css.messageList}
          style={{ minHeight: '100%', padding: `${config.space.S600} 0` }}
        >
          {(!timelineSync.liveTimelineLinked ||
            !timelineSync.rangeAtEnd ||
            timelineSync.forwardStatus !== 'idle') && (
            <PaginationLoader
              status={timelineSync.forwardStatus}
              direction="forward"
              isCompact={messageLayout === MessageLayout.Compact}
              isEmpty={virtualPaginator.getItems().length === 0}
              onRetry={() => timelineSync.handleTimelinePagination(false)}
              observerRef={virtualPaginator.observeFrontAnchor}
            />
          )}

          {processedEvents.map((eventData) => (
            <Fragment key={eventData.id}>
              {renderMatrixEvent(
                eventData.mEvent.getType(),
                typeof eventData.mEvent.getStateKey() === 'string',
                eventData.id,
                eventData.mEvent,
                eventData.itemIndex,
                eventData.timelineSet,
                eventData.collapsed
              )}

              {eventData.willRenderDayDivider && (
                <MessageBase space={messageSpacing}>
                  <TimelineDivider variant="Surface">
                    <Badge as="span" size="500" variant="Secondary" fill="None" radii="300">
                      <Text size="L400">{getDayDividerText(eventData.mEvent.getTs())}</Text>
                    </Badge>
                  </TimelineDivider>
                </MessageBase>
              )}

              {eventData.willRenderNewDivider && (
                <MessageBase space={messageSpacing}>
                  <TimelineDivider style={{ color: color.Success.Main }} variant="Inherit">
                    <Badge as="span" size="500" variant="Success" fill="Solid" radii="300">
                      <Text size="L400">New Messages</Text>
                    </Badge>
                  </TimelineDivider>
                </MessageBase>
              )}
            </Fragment>
          ))}

          {(timelineSync.canPaginateBack ||
            !timelineSync.rangeAtStart ||
            timelineSync.backwardStatus !== 'idle') && (
            <PaginationLoader
              status={timelineSync.backwardStatus}
              direction="backward"
              isCompact={messageLayout === MessageLayout.Compact}
              isEmpty={virtualPaginator.getItems().length === 0}
              onRetry={() => timelineSync.handleTimelinePagination(true)}
              observerRef={
                timelineSync.eventsLength > 0 || !timelineSync.liveTimelineLinked
                  ? virtualPaginator.observeBackAnchor
                  : undefined
              }
            />
          )}

          {!timelineSync.canPaginateBack &&
            timelineSync.rangeAtStart &&
            processedEvents.length > 0 && (
              <div
                style={{
                  padding: `${config.space.S700} ${config.space.S400} ${config.space.S600} ${messageLayout === MessageLayout.Compact ? config.space.S400 : toRem(64)}`,
                }}
              >
                <RoomIntro room={room} />
              </div>
            )}
          <div ref={sentryRef} style={{ height: '1px', width: '100%', flexShrink: 0 }} />
        </Box>
      </Scroll>

      {!isAtBottom && (
        <TimelineFloat position="Bottom">
          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.ArrowBottom} />}
            onClick={() => {
              if (eventId) navigateRoom(room.roomId, undefined, { replace: true });
              timelineSync.setTimeline(getInitialTimeline(room));
              scrollToBottom('instant');
            }}
          >
            <Text size="L400">Jump to Latest</Text>
          </Chip>
        </TimelineFloat>
      )}
    </Box>
  );
}
