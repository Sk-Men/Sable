import { useMemo } from 'react';
import { MatrixEvent, EventTimelineSet, EventTimeline } from '$types/matrix-sdk';
import {
  getTimelineAndBaseIndex,
  getTimelineRelativeIndex,
  getTimelineEvent,
} from '$utils/timeline';
import { reactionOrEditEvent, isMembershipChanged } from '$utils/room';
import { inSameDay, minuteDifference } from '$utils/time';

export interface UseProcessedTimelineOptions {
  items: number[];
  linkedTimelines: EventTimeline[];
  ignoredUsersSet: Set<string>;
  showHiddenEvents: boolean;
  showTombstoneEvents: boolean;
  mxUserId: string | null;
  readUptoEventId: string | undefined;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  isReadOnly: boolean;
  hideMemberInReadOnly: boolean;
}

export interface ProcessedEvent {
  id: string;
  itemIndex: number;
  mEvent: MatrixEvent;
  timelineSet: EventTimelineSet;
  eventSender: string | null;
  collapsed: boolean;
  willRenderNewDivider: boolean;
  willRenderDayDivider: boolean;
}

export function useProcessedTimeline({
  items,
  linkedTimelines,
  ignoredUsersSet,
  showHiddenEvents,
  showTombstoneEvents,
  mxUserId,
  readUptoEventId,
  hideMembershipEvents,
  hideNickAvatarEvents,
  isReadOnly,
  hideMemberInReadOnly,
}: UseProcessedTimelineOptions): (ProcessedEvent | null)[] {
  return useMemo(() => {
    let prevEvent: MatrixEvent | undefined;
    let isPrevRendered = false;
    let newDivider = false;
    let dayDivider = false;

    const chronologicallyProcessed = items.map((item) => {
      const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(linkedTimelines, item);
      if (!eventTimeline) return null;

      const timelineSet = eventTimeline.getTimelineSet();
      const mEvent = getTimelineEvent(eventTimeline, getTimelineRelativeIndex(item, baseIndex));

      if (!mEvent) return null;

      const {
        getId: getEvtId,
        getSender: getEvtSender,
        isRedacted: getEvtIsRedacted,
        getTs: getEvtTs,
        getType: getEvtType,
        threadRootId,
      } = mEvent;

      const mEventId = getEvtId.call(mEvent);
      if (!mEventId) return null;

      const eventSender = getEvtSender.call(mEvent) ?? null;

      if (eventSender && ignoredUsersSet.has(eventSender)) return null;
      if (getEvtIsRedacted.call(mEvent) && !(showHiddenEvents || showTombstoneEvents)) return null;

      const type = getEvtType.call(mEvent);

      if (type === 'm.room.member') {
        const membershipChanged = isMembershipChanged(mEvent);
        if (hideMemberInReadOnly && isReadOnly) return null;
        if (membershipChanged && hideMembershipEvents) return null;
        if (!membershipChanged && hideNickAvatarEvents) return null;
      }

      if (!showHiddenEvents) {
        const isStandardRendered = [
          'm.room.message',
          'm.room.message.encrypted',
          'm.sticker',
          'm.room.member',
          'm.room.name',
          'm.room.topic',
          'm.room.avatar',
          'org.matrix.msc3401.call.member',
        ].includes(type);

        if (!isStandardRendered) {
          if (Object.keys(mEvent.getContent()).length === 0) return null;
          if (mEvent.getRelation()) return null;
          if (mEvent.isRedaction()) return null;
        }
      }

      if (!newDivider && readUptoEventId) {
        const prevId = prevEvent ? prevEvent.getId() : undefined;
        newDivider = prevId === readUptoEventId;
      }

      if (!dayDivider) {
        dayDivider = prevEvent ? !inSameDay(prevEvent.getTs(), getEvtTs.call(mEvent)) : false;
      }

      if (threadRootId !== undefined && threadRootId !== mEventId) return null;

      const isReactionOrEdit = reactionOrEditEvent(mEvent);
      const willBeRendered = !isReactionOrEdit;

      let collapsed = false;
      if (
        isPrevRendered &&
        !dayDivider &&
        (!newDivider || eventSender === mxUserId) &&
        prevEvent !== undefined
      ) {
        const { getSender: getPrevSender, getType: getPrevType, getTs: getPrevTs } = prevEvent;
        collapsed =
          getPrevSender.call(prevEvent) === eventSender &&
          getPrevType.call(prevEvent) === type &&
          minuteDifference(getPrevTs.call(prevEvent), getEvtTs.call(mEvent)) < 2;
      }

      const willRenderNewDivider = newDivider && willBeRendered && eventSender !== mxUserId;
      const willRenderDayDivider = dayDivider && willBeRendered;

      prevEvent = mEvent;
      isPrevRendered = willBeRendered;

      if (willRenderNewDivider) newDivider = false;
      if (willRenderDayDivider) dayDivider = false;

      if (!willBeRendered) return null;

      return {
        id: mEventId,
        itemIndex: item,
        mEvent,
        timelineSet,
        eventSender,
        collapsed,
        willRenderNewDivider,
        willRenderDayDivider,
      };
    });

    return chronologicallyProcessed;
  }, [
    items,
    linkedTimelines,
    ignoredUsersSet,
    showHiddenEvents,
    showTombstoneEvents,
    mxUserId,
    readUptoEventId,
    hideMembershipEvents,
    hideNickAvatarEvents,
    isReadOnly,
    hideMemberInReadOnly,
  ]);
}
