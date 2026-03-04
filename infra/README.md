# Infrastructure

`infra/web` manages the Cloudflare Worker service, immutable Worker version uploads,
the live production deployment, and the Worker custom domain. Local setup uses
`terraform.tfvars.example` for shared inputs and `gitlab.http.tfbackend.example` for
the GitLab state backend config.

Prerequisites:

- OpenTofu `1.11.x` installed locally
- Node.js/npm installed locally so you can build `dist/` before Worker uploads
- A Cloudflare account with the target zone already onboarded to Cloudflare
- A GitLab project to store the OpenTofu state
- A GitLab access token that can read and write that project's OpenTofu state

Required GitHub repository secrets:

- `TF_CLOUDFLARE_API_TOKEN`
- `TF_VAR_ACCOUNT_ID`
- `TF_VAR_ZONE_ID`
- `TF_HTTP_ADDRESS`
- `TF_HTTP_LOCK_ADDRESS`
- `TF_HTTP_UNLOCK_ADDRESS`
- `TF_HTTP_USERNAME`
- `TF_HTTP_PASSWORD`

The workflows map those secrets onto the actual runtime environment variable names
that Cloudflare and OpenTofu expect.

Cloudflare API token permissions:

- `Account > Workers Scripts > Edit`
- Scope the token to the specific Cloudflare account that owns the Worker.
- Scope the token to the specific zone that serves `app.sable.moe`.
- Do not grant Pages or DNS edit permissions here. The Worker script upload and
  custom-domain attach endpoints used by this repo accept Workers Scripts Write, and
  Cloudflare creates the DNS record for the Worker custom domain automatically.

GitLab access token permissions:

- `api`

Helpful reference links:

- Create the main Cloudflare API token:
  https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- Find your account ID and zone ID:
  https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/
- GitLab-managed OpenTofu state:
  https://docs.gitlab.com/user/infrastructure/iac/terraform_state/

Local setup:

1. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in shared values.
2. Copy `gitlab.http.tfbackend.example` to `gitlab.http.tfbackend` and fill in the
   GitLab project ID, state name, and username.
3. Run `npm ci` from the repo root.
4. Export the GitLab access token as the backend password.
5. Export the Cloudflare API token for OpenTofu.
6. Run `npm run build` before `tofu plan` or `tofu apply`, because
   `cloudflare_worker_version` uploads the built `dist/` assets.
7. Initialize the backend.

Local OpenTofu production flow from the repo root:

```bash
npm run build
export TF_HTTP_PASSWORD="<your-gitlab-access-token>"
export CLOUDFLARE_API_TOKEN="<your-cloudflare-api-token>"
tofu -chdir=infra/web init -reconfigure -backend-config="../gitlab.http.tfbackend"
tofu -chdir=infra/web validate
tofu -chdir=infra/web plan -var-file="../terraform.tfvars"
tofu -chdir=infra/web apply -var-file="../terraform.tfvars"
```

Optional local OpenTofu deployment message:

```bash
export TF_VAR_workers_message="$(git log -1 --pretty=%s)"
tofu -chdir=infra/web apply -var-file="../terraform.tfvars"
```

If you already created local state before switching to GitLab state, use
`tofu -chdir=infra/web init -reconfigure -migrate-state -backend-config="../gitlab.http.tfbackend"`
once instead.

Preview deploys:

- PR previews use Wrangler `versions upload` against the generated
  `dist/wrangler.json`.
- That Wrangler-based preview path is temporary until the Cloudflare provider adds support for preview version/alias management.
- `npm run build` generates both `dist/` and `dist/wrangler.json`; Wrangler uploads a
  preview Worker version and binds a stable alias such as `pr-123`.
- GitHub Actions also sets the preview version message from the current git commit
  subject, truncated to 100 bytes to fit Cloudflare's limit.
- Preview URLs live on `workers.dev` and do not touch the live custom domain.

Production deploys:

- PRs that change `infra/web` get an OpenTofu plan comment on the PR from
  `.github/workflows/cloudflare-worker-prod.yml`.
- `.github/workflows/cloudflare-worker-prod.yml` builds the app and runs `tofu apply` on
  pushes to `dev`, or via manual workflow dispatch.
- `tofu apply` uploads `dist/` as a new immutable Worker version with
  `cloudflare_worker_version`, then `cloudflare_workers_deployment` moves live traffic
  to that exact version.
- GitHub Actions sets the production deployment message from the current git commit
  subject, truncated to 100 bytes to fit Cloudflare's limit.
- `app.sable.moe` is the Worker custom domain for production.
- `cloudflare_workers_custom_domain` attaches the Worker to `app.sable.moe`, and
  Cloudflare creates the backing DNS record automatically.
