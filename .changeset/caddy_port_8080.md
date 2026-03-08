---
sable: patch
---

Fix container startup failure under hardened deployments (e.g. matrix-docker-ansible-deploy) that run with `--cap-drop=ALL` and `--read-only`.

Two issues were present:

1. `caddy:2-alpine` sets `cap_net_bind_service=+ep` as a file capability on `/usr/bin/caddy`. With an empty bounding capability set (`--cap-drop=ALL`), the kernel refuses to exec the binary entirely, producing `exec /usr/bin/caddy: operation not permitted`. Fixed by stripping the file capability in the Dockerfile (`setcap -r /usr/bin/caddy`).

2. The Caddyfile was listening on `:80`, which is a privileged port. The container runs as a non-root user and with `CAP_NET_BIND_SERVICE` dropped, so port 80 is unavailable. Beyond that constraint, binding to low-numbered ports inside a container is generally discouraged — production deployments sit behind a reverse proxy that handles 80/443 externally. Fixed by changing the Caddyfile to listen on `:8080`.
