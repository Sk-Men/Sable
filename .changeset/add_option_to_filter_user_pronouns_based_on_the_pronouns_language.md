---
default: minor
---

# Add option to filter user pronouns based on the pronouns language

#154 by git@itsrye.dev

## Description

the MSC4247 (which we are using in its unstable form) states:

> All fields within m.pronouns are optional, excluding "language" and "summary"

Therefore it would be useful to have a possibility to set the language of a pronoun set.

This can be done by optionally (default: english, so not to cause unexpected behaviour) specifying the language, e.g. `en:she/her`.

In this case it's equivalent to just entering `she/her`

Also a way to filter the shown pronouns based on a specified language was introduced. This will find it's home under experimental features for the time being.

It also accepts "*weird*" string inputs as pronoun, for example setting your pronouns just to `meow` will internally be transformed to `en:meow`.

There are multiple ways to set your pronouns:

1. The UI like before but with optional language specifier
2. The `/Pronoun` and `/GPronoun` commands with their behaviour unchanged besides the language based transformation.
