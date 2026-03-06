---
sable: patch
---

Service worker push notifications now correctly deep-link to the right account and room on cold PWA launch. Notifications are automatically suppressed when the app window is already visible. The In-App (pill banner) and System (OS) notification settings are now independent: desktop shows both controls, mobile shows Push and In-App only. Tapping an in-app notification pill on mobile now opens the room timeline directly instead of routing through the space navigation panel.
