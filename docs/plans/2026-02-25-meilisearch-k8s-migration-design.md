# MeiliSearch K8s Migration Design

## Goal

Move MeiliSearch from a standalone DigitalOcean droplet (v1.2.0) into the production Kubernetes cluster, pinned to v1.3.0+. This restores the `showRankingScore` feature (broken because v1.2.0 doesn't support it in multi-search) and consolidates all infrastructure into the cluster.

## Context

- Production MeiliSearch currently runs on a separate DigitalOcean droplet at `142.93.153.29`, version 1.2.0
- `showRankingScore` in multi-search requires MeiliSearch v1.3.0+; without it all search results have `score: 0` and relevance sorting across indices is lost
- Dev already runs MeiliSearch in k8s (`k8s-dev/meilisearch.yaml`) — no persistence needed in dev, but production requires a PVC
- Re-indexing is done via `saveAll` in `server/src/testing/saveAll.ts`, which pushes all MongoDB documents to MeiliSearch

## Architecture

### New file: `k8s/meilisearch-statefulset.yaml`

Follows the same pattern as `k8s/postgres-statefulset.yaml`:

- **StatefulSet**, 1 replica, `getmeili/meilisearch:v1.3.0` (or latest stable v1.x)
- **PVC**: 5Gi, `do-block-storage` StorageClass, `ReadWriteOnce`
- **Data directory**: `/meili_data`
- **Env**:
  - `MEILI_MASTER_KEY` from `search` secret (`apiKey` key)
  - `MEILI_ENV=production` (disables search preview UI, enforces auth)
- **Node selector**: `doks.digitalocean.com/node-pool: default-pool`
- **Resources**: 250m/256Mi requests, 1000m/512Mi limits
- **Service**: headless ClusterIP named `meilisearch` on port 7700

### Secret update

`search` secret `host` key: `142.93.153.29` → `http://meilisearch:7700`

### New file: `server/src/scripts/reindex-search.ts`

Standalone script (same pattern as `backfill-postgres.ts`) that connects to MongoDB and calls `saveAll` to repopulate all MeiliSearch indices. Run as a one-off pod after cutover.

## Migration Steps

1. Apply `k8s/meilisearch-statefulset.yaml` — StatefulSet and PVC come up, MeiliSearch starts with empty indices
2. Update `search` secret `host` to `http://meilisearch:7700`
3. Restart server pods to pick up new secret — they now point at in-cluster MeiliSearch
4. Run `reindex-search.ts` as a one-off pod to repopulate all indices from MongoDB
5. Verify search works in production
6. Delete the DigitalOcean droplet

A brief window of degraded search (empty results) exists between steps 3 and 4 completing. This is acceptable.

## Files

| File | Change |
|------|--------|
| `k8s/meilisearch-statefulset.yaml` | Create — StatefulSet + Service |
| `server/src/scripts/reindex-search.ts` | Create — re-index script |
| `search` secret (`host` key) | Update via `kubectl` — not a code change |
