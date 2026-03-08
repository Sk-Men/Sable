---
sable: patch
---

Fix Caddyfile to listen on port 8080 instead of 80. Deployment methods such as matrix-docker-ansible-deploy run the container with `--cap-drop=ALL`, which removes `CAP_NET_BIND_SERVICE` and makes privileged ports (<1024) unavailable. Beyond that specific constraint, binding directly to low-numbered ports inside a container is generally discouraged — production deployments are expected to sit behind a reverse proxy (e.g. Traefik, nginx) that handles port 80/443 externally.
