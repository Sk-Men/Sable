import { Direction, EventTimeline, MatrixEvent, Room } from '$types/matrix-sdk';
import { roomHaveNotification, roomHaveUnread, reactionOrEditEvent } from '$utils/room';

export const PAGINATION_LIMIT = 60;

export const getLiveTimeline = (room: Room): EventTimeline =>
  room.getUnfilteredTimelineSet().getLiveTimeline();

export const getEventTimeline = (room: Room, eventId: string): EventTimeline | undefined => {
  const timelineSet = room.getUnfilteredTimelineSet();
  return timelineSet.getTimelineForEvent(eventId) ?? undefined;
};

export const getFirstLinkedTimeline = (
  timeline: EventTimeline,
  direction: Direction
): EventTimeline => {
  const linkedTm = timeline.getNeighbouringTimeline(direction);
  if (!linkedTm) return timeline;
  return getFirstLinkedTimeline(linkedTm, direction);
};

export const getLinkedTimelines = (timeline: EventTimeline): EventTimeline[] => {
  const firstTimeline = getFirstLinkedTimeline(timeline, Direction.Backward);
  const timelines: EventTimeline[] = [];

  for (
    let nextTimeline: EventTimeline | null = firstTimeline;
    nextTimeline;
    nextTimeline = nextTimeline.getNeighbouringTimeline(Direction.Forward)
  ) {
    timelines.push(nextTimeline);
  }
  return timelines;
};

export const timelineToEventsCount = (t: EventTimeline) => {
  if (!t) return 0;
  const events = t.getEvents();
  return events ? events.length : 0;
};

export const getTimelinesEventsCount = (timelines: EventTimeline[]): number => {
  const timelineEventCountReducer = (count: number, tm: EventTimeline) =>
    count + timelineToEventsCount(tm);
  return (timelines || [])
    .filter(Boolean)
    .reduce((accumulator, element) => timelineEventCountReducer(accumulator, element), 0);
};

export const getTimelineAndBaseIndex = (
  timelines: EventTimeline[],
  index: number
): [EventTimeline | undefined, number] => {
  let uptoTimelineLen = 0;
  const validTimelines = (timelines || []).filter(Boolean);

  const timeline = validTimelines.find((t) => {
    const events = t.getEvents();
    if (!events) return false;

    uptoTimelineLen += events.length;
    return index < uptoTimelineLen;
  });

  if (!timeline) return [undefined, 0];

  const events = timeline.getEvents();
  const timelineLen = events ? events.length : 0;

  return [timeline, Math.max(0, uptoTimelineLen - timelineLen)];
};

export const getTimelineRelativeIndex = (absoluteIndex: number, timelineBaseIndex: number) =>
  absoluteIndex - timelineBaseIndex;

export const getTimelineEvent = (
  timeline: EventTimeline,
  index: number
): MatrixEvent | undefined => {
  if (!timeline) return undefined;
  const events = timeline.getEvents();
  return events ? events[index] : undefined;
};

export const getEventIdAbsoluteIndex = (
  timelines: EventTimeline[],
  eventTimeline: EventTimeline,
  eventId: string
): number | undefined => {
  const timelineIndex = timelines.indexOf(eventTimeline);
  if (timelineIndex === -1) return undefined;

  const currentEvents = eventTimeline.getEvents();
  if (!currentEvents) return undefined;

  const eventIndex = currentEvents.findIndex((evt: MatrixEvent) => evt.getId() === eventId);
  if (eventIndex === -1) return undefined;

  const baseIndex = timelines.slice(0, timelineIndex).reduce((accValue, timeline) => {
    const evs = timeline.getEvents();
    return (evs ? evs.length : 0) + accValue;
  }, 0);

  return baseIndex + eventIndex;
};

export const getInitialTimeline = (room: Room) => {
  const linkedTimelines = getLinkedTimelines(getLiveTimeline(room));
  const evLength = getTimelinesEventsCount(linkedTimelines);
  return {
    linkedTimelines,
    range: {
      start: Math.max(evLength - PAGINATION_LIMIT, 0),
      end: evLength,
    },
  };
};

export const getEmptyTimeline = () => ({
  range: { start: 0, end: 0 },
  linkedTimelines: [],
});

export const getRoomUnreadInfo = (room: Room, scrollTo = false) => {
  if (!roomHaveNotification(room) && !roomHaveUnread(room.client, room)) return undefined;

  const readUptoEventId = room.getEventReadUpTo(room.client.getUserId() ?? '');
  if (!readUptoEventId) return undefined;
  const evtTimeline = getEventTimeline(room, readUptoEventId);
  const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
  return {
    readUptoEventId,
    inLiveTimeline: latestTimeline === room.getLiveTimeline(),
    scrollTo,
  };
};

export const getThreadReplyCount = (room: Room, mEventId: string): number =>
  room
    .getUnfilteredTimelineSet()
    .getLiveTimeline()
    .getEvents()
    .filter(
      (ev) => ev.threadRootId === mEventId && ev.getId() !== mEventId && !reactionOrEditEvent(ev)
    ).length;
