---
sable: minor
---

# avatars!

#227 by @melogale

I bring in https://github.com/melogale/element-call/tree/avatars as a submodule for now.

Element call disables thumbnails in widget mode by default, and it can't really be overridden except by janky means. Forking element call allows us to set this up kind of cleanly though!

In element call, we add two new capabilities to the host-widget contract.

`moe.sable.thumbnails`
`moe.sable.media_proxy`

If neither is set, fallback thumbnails will be used: the letter over color sort.
If `moe.sable.thumbnails` is set, element call will attempt to use the old unauthenticated media endpoint to grab thumbnails.
If `moe.sable.media_proxy` or both are set, will shoot for the authenticated endpoint, and hope and pray the client hosting the widget keeps its promise: adding authentication to the request, via a service worker or something.

Sable automatically accepts all capability requests, so these are set, and in fact, we add on authentication to media requests in the service worker!

Since the frames in which widgets run have separate client ids, I simply look through the session list and find a session with the right base url. This is kind of odd: it could end up being for a different user on another tab.

But as things are, the server doesn't care: so long as its authenticated by a user on the server.
Ideally it would use the session info for the tab hosting the widget, but I couldn't come up with a super clean way of doing that doesn't distract from the proof of concept. Let me know if anyone has any ideas for that. Or if we don't care for now.
