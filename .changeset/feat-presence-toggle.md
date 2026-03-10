---
sable: minor
---

Adds a **Presence Status** toggle under Settings → General.

- New `sendPresence` setting (boolean, default `true`) persisted in localStorage
- When disabled, the MSC4186 presence extension sends `{ enabled: false }` so the server stops delivering presence events
- Also disables presence for classic sync via `client.setSyncPresence('offline')`
- Takes effect at runtime — no reconnect needed
