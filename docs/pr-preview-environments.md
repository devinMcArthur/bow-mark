# PR Preview Environments

## Overview

This document specifies the design and implementation plan for automated per-PR preview environments on the bow-mark Kubernetes cluster. When a pull request is opened or updated, a live preview of the full application stack is automatically deployed and exposed at `pr-<N>.dev.hubsite.app`. When the PR is closed or merged, the preview is torn down automatically.

---

## Goals

- Give reviewers a live URL to interact with every PR without running the app locally
- Reuse the existing DigitalOcean cluster — no new nodes or clusters required
- Keep infrastructure costs near zero by sharing stateful services across all previews
- Integrate with the existing CI image-build pipeline
- Automatically clean up when PRs close

---

## Architecture

### Namespace

All preview resources live in a dedicated `preview` namespace, isolated from `default` (production).

### Shared Infrastructure (one set, always running)

The following stateful services run once in the `preview` namespace and are shared across all open PRs. They are cheap to run and avoid the cost/time of spinning up a fresh database per PR.

| Service | Image | CPU Request | RAM Request |
|---|---|---|---|
| MongoDB | `mongo:7` | 150m | 256Mi |
| PostgreSQL | `postgres:16` | 100m | 128Mi |
| RabbitMQ | `rabbitmq:3-management` | 75m | 128Mi |
| Meilisearch | `getmeili/meilisearch:latest` | 100m | 256Mi |

**Database isolation:** Each PR gets its own database names to prevent data collisions:
- MongoDB: `bowmark_pr_<N>` 
- PostgreSQL: `bowmark_reports_pr_<N>`

### Per-PR App Layer

Each open PR gets its own set of lightweight app deployments, named with the PR number:

| Workload | Replicas | CPU Request/Limit | RAM Request/Limit |
|---|---|---|---|
| `server-pr-<N>` | 1 | 250m / 1000m | 512Mi / 1024Mi |
| `client-pr-<N>` | 1 | 125m / 500m | 256Mi / 512Mi |

Workers and consumers are **not** deployed in preview environments by default — they can be added later if needed for testing background jobs.

### DNS & Routing

Each PR preview is exposed at `pr-<N>.dev.hubsite.app` via a Cloudflare DNS record (A record or CNAME pointing to the cluster ingress). An nginx Ingress rule routes traffic to the correct client/server pods for that PR number.

### Resource Budget

With the existing cluster headroom (~7,900m CPU / ~16 GiB RAM on `default-pool`), the preview environment can comfortably support:

- Shared infra: ~425m CPU / ~768Mi RAM (one-time)
- Per PR: ~375m CPU / ~768Mi RAM
- 10 concurrent open PRs: ~4,175m CPU / ~8.4 GiB RAM — still within headroom

No new nodes are required.

---

## New Files & Changes

### Kubernetes Manifests

```
k8s/
  preview/
    namespace.yaml              # preview namespace definition
    shared-infra.yaml           # MongoDB, PostgreSQL, RabbitMQ, Meilisearch
    ingress-template.yaml       # Nginx Ingress template for per-PR routing
    pr-server.template.yaml     # Server Deployment template (parameterised)
    pr-client.template.yaml     # Client Deployment template (parameterised)
    pr-configmap.template.yaml  # ConfigMap with per-PR env vars
```

### GitHub Actions Workflows

```
.github/workflows/
  pr-preview.yml          # Triggered on PR open / synchronize
  pr-preview-teardown.yml # Triggered on PR close
```

### Required New Secrets (GitHub repository secrets)

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Create/delete DNS records via Cloudflare API |
| `CLOUDFLARE_ZONE_ID` | The zone ID for `hubsite.app` in Cloudflare |

Existing secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_PASS`, `DO_API_TOKEN`, `DO_CLUSTER` are reused as-is.

---

## Workflow Details

### `pr-preview.yml` — Deploy Preview

**Trigger:** `pull_request` events: `opened`, `synchronize`, `reopened`

**Steps:**

1. **Checkout** the PR branch
2. **Build server image** — `docker build` from `server/Dockerfile.dev` (or a new `Dockerfile.preview`), tagged `itsdevin/bow-mark-server:pr-<N>-<sha>`
3. **Build client image** — `docker build` from `client/Dockerfile` with paving env vars baked in, tagged `itsdevin/bow-mark-client:pr-<N>-<sha>`
4. **Push both images** to Docker Hub using existing `DOCKERHUB_*` secrets
5. **Connect to DigitalOcean cluster** via `doctl kubernetes cluster kubeconfig save` using `DO_API_TOKEN` + `DO_CLUSTER`
6. **Apply shared infra** — `kubectl apply -f k8s/preview/shared-infra.yaml` (idempotent; no-op if already running)
7. **Apply per-PR resources** — substitute `PR_NUMBER`, `SERVER_IMAGE`, `CLIENT_IMAGE`, `APP_NAME` into templates and apply:
   - ConfigMap (`bowmark_pr_<N>` DB names, env vars)
   - Server Deployment
   - Client Deployment
   - Ingress rule for `pr-<N>.dev.hubsite.app`
8. **Create/update Cloudflare DNS record** — `A` record for `pr-<N>.dev.hubsite.app` pointing to the cluster ingress IP, using Cloudflare API via `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID`
9. **Wait for rollout** — `kubectl rollout status deployment/server-pr-<N> -n preview --timeout=120s`
10. **Post PR comment** — Use GitHub API to create or update a comment on the PR with the preview URL and image tags. Comment format:

```
🚀 **Preview deployed:** https://pr-<N>.dev.hubsite.app

| | |
|---|---|
| Server image | `itsdevin/bow-mark-server:pr-<N>-<sha>` |
| Client image | `itsdevin/bow-mark-client:pr-<N>-<sha>` |
| Updated | <!-- timestamp --> |
```

### `pr-preview-teardown.yml` — Destroy Preview

**Trigger:** `pull_request` events: `closed`

**Steps:**

1. **Connect to DigitalOcean cluster**
2. **Delete per-PR Kubernetes resources** — `kubectl delete deployment,service,ingress,configmap -l pr=<N> -n preview`
3. **Delete Cloudflare DNS record** for `pr-<N>.dev.hubsite.app`
4. **Delete Docker Hub images** (optional — images are small and cheap to retain for a short period)
5. **Update PR comment** to indicate the preview has been torn down

---

## App Type Handling

The app supports `paving` and `concrete` variants. PR previews default to `paving`. The `pr-preview.yml` workflow can accept a `workflow_dispatch` input `app_name` (`paving` | `concrete`) for manual overrides, but automatic PR triggers always use `paving`.

Client images follow the existing naming convention:
- Paving: `itsdevin/bow-mark-client:pr-<N>-<sha>`
- Concrete: `itsdevin/bow-mark-concrete-client:pr-<N>-<sha>` (not built by default)

---

## Rollout Plan

### Phase 1 — Shared infra & namespace (Day 1)
- Create `k8s/preview/namespace.yaml` and `k8s/preview/shared-infra.yaml`
- Manually apply to cluster and verify MongoDB, Postgres, RabbitMQ, Meilisearch start healthy
- Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` to GitHub repo secrets

### Phase 2 — Per-PR templates (Day 1-2)
- Create Deployment, ConfigMap, and Ingress templates
- Manually test by substituting a real PR number and applying with `kubectl`
- Verify the app loads at `pr-<N>.dev.hubsite.app`

### Phase 3 — Automate with GitHub Actions (Day 2-3)
- Implement `pr-preview.yml` and `pr-preview-teardown.yml`
- Test on a throwaway PR
- Verify comment is posted, URL works, teardown is clean

### Phase 4 — Rollout
- Enable on all PRs going forward
- Monitor cluster resource usage for the first week

---

## Open Questions

1. **Missing paving server manifest** — `/k8s/server-deployment.yaml` (paving) does not exist in the repo. Only the concrete variant is present. This should be investigated and resolved before or alongside this feature, as the preview environment will need a working server manifest to template from.

2. **Build time** — Building both server and client images from scratch on every PR push could be slow (5-10 min). Consider using Docker layer caching via the existing `buildcache` tag pattern already used in `ci.yml`.

3. **Shared database data** — The shared Postgres and MongoDB instances will accumulate data from all PR previews. A nightly cleanup CronJob should purge databases older than X days. **CronJobs from production (`pg-backup`, `nightly-worker-restart`) must NOT be applied to the preview namespace.**

4. **Ingress controller** — The existing production cluster needs an nginx Ingress controller installed in the `preview` namespace (or cluster-wide) for per-PR routing to work. Verify this is already present.

5. **App type per PR** — Should the workflow detect which app type to build based on PR labels or branch naming conventions, rather than always defaulting to paving?

6. **Secret management for preview** — The preview environment needs its own set of API keys (Google Maps, etc.). Decide whether to use the same keys as production or maintain separate preview-tier keys.
