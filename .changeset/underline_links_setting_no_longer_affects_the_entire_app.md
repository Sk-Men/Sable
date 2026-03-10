---
default: patch
---

# "Underline Links" setting no longer affects the entire app

The "Underline Links" accessibility setting was incorrectly applying link underlines globally, including to buttons in the Lobby and Message Search in spaces. It is now scoped to only the areas where it's relevant, which is chat messages, user bios, and room descriptions. The setting description in Appearance has been updated to reflect this.
