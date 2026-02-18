# Sable Client Changelog

## Version 0.0.1

- Added name colors and fonts to the member list sidebar.
- Added a reset button to the room name input box for dms.
  - Reset's the dm room name to the name of the other user (on both ends).
  - Same as saving a blank room name.
- Added Cosmetics tab to room and space settings.
- New cosmetic commands, requires power level 50. Permission located in Cosmetics tab.
  - /color #ffffff -> change your name color for a room
  - /gcolor #111111 -> change your name color for a space
  - /font monospace -> change your name font for a room
  - /font Courier New -> change your name font for a space
- Hierarchies
  - Room Color > Space Color > Role Color > Default
  - Room Font > Space Font > Default
    - _Note, if the room font is invaild it will fallback directly to default, not the space font._
- Includes all features in Cinny v4.10.3
- So much refractoring... so much pain...
