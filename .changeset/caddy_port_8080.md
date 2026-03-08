---
sable: patch
---

Fix Caddyfile to listen on port 8080 instead of 80. The container runs with `--cap-drop=ALL`, which removes `CAP_NET_BIND_SERVICE`, making privileged ports (<1024) unavailable.
