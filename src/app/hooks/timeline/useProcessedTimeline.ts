import { useMemo } from 'react';
import { MatrixEvent, EventTimelineSet, EventTimeline } from '$types/matrix-sdk';
import {
  getTimelineAndBaseIndex,
  getTimelineRelativeIndex,
  getTimelineEvent,
} from '$utils/timeline';
import { reactionOrEditEvent } from '$utils/room';
import { inSameDay, minuteDifference } from '$utils/time';

export interface UseProcessedTimelineOptions {
  items: number[];
  linkedTimelines: EventTimeline[];
  ignoredUsersSet: Set<string>;
  showHiddenEvents: boolean;
  showTombstoneEvents: boolean;
  mxUserId: string | null;
  readUptoEventId: string | undefined;
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
}: UseProcessedTimelineOptions): ProcessedEvent[] {
  return useMemo(() => {
    let prevEvent: MatrixEvent | undefined;
    let isPrevRendered = false;
    let newDivider = false;
    let dayDivider = false;

    const chronologicallyProcessed = items
      .map((item) => {
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

        if (eventSender && ignoredUsersSet.has(eventSender)) {
          return null;
        }

        if (getEvtIsRedacted.call(mEvent) && !(showHiddenEvents || showTombstoneEvents)) {
          return null;
        }

        if (!newDivider && readUptoEventId) {
          const prevId = prevEvent ? prevEvent.getId() : undefined;
          newDivider = prevId === readUptoEventId;
        }

        if (!dayDivider) {
          dayDivider = prevEvent ? !inSameDay(prevEvent.getTs(), getEvtTs.call(mEvent)) : false;
        }

        if (threadRootId !== undefined && threadRootId !== mEventId) {
          return null;
        }

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
            getPrevType.call(prevEvent) === getEvtType.call(mEvent) &&
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
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return chronologicallyProcessed.reverse();
  }, [
    items,
    linkedTimelines,
    ignoredUsersSet,
    showHiddenEvents,
    showTombstoneEvents,
    mxUserId,
    readUptoEventId,
  ]);
}
