---
default: patch
---

Fix several small UI/UX issues:

- **#2**: Reduced-motion: add `animation-iteration-count: 1` so spinners stop after one cycle instead of running indefinitely at near-zero speed
- **#44**: Account switcher: show a confirmation dialog before signing out of an account
- **#45**: Server picker: prevent iOS from restoring the old server name while the user is actively editing the input
- **#52**: Message editor: add `autoCapitalize="sentences"` to respect the OS/keyboard setting on mobile
- **#66**: Adding account: show a "Cancel" button next to the "Adding account" label so users can abort the flow
- **#67**: Support `matrixToBaseUrl` in `config.json` to override the default matrix.to link base
- **#79/#35**: Autocomplete: pressing Enter now selects the highlighted item instead of sending the message; the first item is highlighted on open and Arrow Up/Down navigate the list while keeping typing focus in the editor
- **#69**: Autocomplete: focus returns to the message editor after completing a mention or emoji
- **#103**: Browser tab/PWA theme-color: use the correct light (`#ffffff`) and dark (`#1b1a21`) colours via media-query meta tags
- **#120**: Video messages: volume is persisted across page loads via `localStorage`
- **#168**: Notifications: add "Favicon Dot: Mentions Only" setting — when enabled, the favicon only changes for mentions/keywords, not plain unreads
