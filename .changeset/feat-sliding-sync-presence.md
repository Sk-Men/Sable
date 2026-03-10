---
sable: minor
---

Rewrites the sliding sync implementation to match the Element Web approach (MSC4186).

- Room list sorted by notification level, recency, then name
- `include_old_rooms` added so tombstoned rooms pass predecessor state to replacements
- Active-room custom subscription: focused room receives `timeline_limit=50`
- `subscribeToRoom` / `unsubscribeFromRoom` API on `SlidingSyncManager`
- `useSlidingSyncActiveRoom` hook + `SlidingSyncActiveRoomSubscriber` component
- Registers a custom `ExtensionPresence` so `m.presence` events from the server are processed into the SDK's `User` model — fixes components using `useUserPresence` always showing stale/default presence
- Always reinitialises the timeline on `TimelineRefresh` events to fix a silent hang where the room timeline stops updating after a reconnect
