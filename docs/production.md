# Production Infrastructure

DigitalOcean Kubernetes (DOKS) cluster running all services. CI/CD via CircleCI on pushes to `master`.

## Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │          Nginx Ingress + TLS            │
                        │      (cert-manager / Let's Encrypt)     │
                        └────┬──────────┬──────────┬──────────────┘
                             │          │          │
                    paving.bowmark.ca   │   concrete.bowmark.ca
                    app.bowmark.ca      │
                             │          │          │
                     ┌───────▼──┐  ┌────▼───┐  ┌──▼─────────┐
                     │ Client   │  │ Client │  │ Server     │
                     │ (Paving) │  │(Concr.)│  │ (Paving x2)│
                     └──────────┘  └────────┘  └─────┬──────┘
                                                     │
              ┌──────────────────────────────────────┤
              │                                      │
        ┌─────▼─────┐  ┌────────────┐         ┌─────▼─────┐
        │ MongoDB    │  │ Meilisearch│         │ Server    │
        │ (Atlas)    │  │            │         │(Concrete) │
        └─────┬──────┘  └────────────┘         └─────┬─────┘
              │                                      │
              │  post-save hooks                     │
              │                                      │
        ┌─────▼──────────────────────────────────────▼─────┐
        │                   RabbitMQ                        │
        │   vhost: bowmark (paving)                         │
        │   vhost: bowmark-concrete (concrete)              │
        └──────┬──────────────────────────────┬────────────┘
               │                              │
        ┌──────▼──────┐               ┌───────▼────────┐
        │ Consumer    │               │ Consumer       │
        │ (Paving)    │               │ (Concrete)     │
        └──────┬──────┘               └───────┬────────┘
               │                              │
        ┌──────▼──────────────────────────────▼──────┐
        │                 PostgreSQL                  │
        │          (StatefulSet + PVC)                │
        │   bowmark_reports_paving                    │
        │   bowmark_reports_concrete                  │
        └─────────────────────────────────────────────┘
```

## Node Pools

| Pool | Size | Autoscaling | Workloads |
|------|------|-------------|-----------|
| `dedicated-cpu-optimized` | c-2 (2vCPU/4Gi) | 4–6 | Server (Paving x2), Server (Concrete x2) |
| `default-pool` | s-1vcpu-2gb | 4–6 | Workers, Consumers, PostgreSQL, RabbitMQ, Clients |

## Services

### MongoDB (Atlas — Managed)
- Hosted on MongoDB Atlas (external, not in k8s)
- Separate databases for paving and concrete
- Connection strings in `paving` and `concrete` Secrets (`mongoURI` key)

### PostgreSQL (Self-hosted)
- **Manifest**: `k8s/postgres-statefulset.yaml`
- **Type**: StatefulSet (1 replica)
- **Storage**: 10Gi PVC on `do-block-storage`
- **Image**: `postgres:16`
- **Databases**: `bowmark_reports_paving` (created via `POSTGRES_DB` env var), `bowmark_reports_concrete` (created by init ConfigMap script)
- **Credentials**: `postgres` Secret
- **Health checks**: `pg_isready`
- **Data path**: `/var/lib/postgresql/data/pgdata` (subdirectory avoids PVC mount conflicts)
- **Local socket**: Allows passwordless `psql` connections from within the pod (useful for maintenance)

### RabbitMQ (Self-hosted)
- **Manifest**: `k8s/rabbitmq-statefulset.yaml`
- **Type**: StatefulSet (1 replica)
- **Storage**: 5Gi PVC on `do-block-storage`
- **Image**: `rabbitmq:3-management`
- **Credentials**: `rabbitmq` Secret
- **Vhosts**: `bowmark` (paving), `bowmark-concrete` (concrete) — fully isolated, no cross-triggering
- **Vhost config**: Declared in `rabbitmq-config` ConfigMap (auto-created on every startup via `load_definitions`)
- **Health checks**: `rabbitmq-diagnostics ping` (readiness, 10s timeout), `rabbitmq-diagnostics status` (liveness, 10s timeout)
- **Management UI**: Port 15672 (cluster-internal only)

### Meilisearch (External)
- Connection via `search` Secret (`host`, `apiKey`)
- Used for full-text search in the app

## Deployments

All server/worker/consumer deployments use image `itsdevin/bow-mark-server:$COMMIT_SHA1`.
Client deployments use `itsdevin/bow-mark-client:$COMMIT_SHA1` (paving) and `itsdevin/bow-mark-concrete-client:$COMMIT_SHA1` (concrete).

| Deployment | Replicas | Node Pool | RabbitMQ Vhost |
|------------|----------|-----------|----------------|
| `server-deployment` | 2 | cpu-optimized | `bowmark` |
| `server-concrete-deployment` | 2 | cpu-optimized | `bowmark-concrete` |
| `worker-deployment` | 1 | default-pool | `bowmark` |
| `worker-concrete-deployment` | 1 | default-pool | `bowmark-concrete` |
| `consumer-deployment` | 1 | default-pool | `bowmark` |
| `consumer-concrete-deployment` | 1 | default-pool | `bowmark-concrete` |
| `client-deployment` | 1 | default-pool | — |
| `client-concrete-deployment` | 1 | default-pool | — |

### Consumer Details
- **Command**: `node dist/consumer/index.js`
- **Init container**: `ghcr.io/amacneil/dbmate:2` runs PostgreSQL migrations before the consumer starts. Idempotent — already-applied migrations are skipped.
- **Migrations source**: `pg-migrations` ConfigMap (built from `db/migrations/` in CI)
- Connects to: MongoDB (read source documents), RabbitMQ (receive sync events), PostgreSQL (write reporting data)

## Kubernetes Secrets

All secrets must be created manually before first deployment. Store values in 1Password under **"Bow-Mark Production K8s"**.

> **Password generation**: Always use `openssl rand -hex 32` (not `-base64`) to avoid URL-unsafe characters that break connection strings.

### `postgres`
```bash
kubectl create secret generic postgres \
  --from-literal=user=bowmark \
  --from-literal=password="$(openssl rand -hex 32)" \
  --from-literal=host=postgres \
  --from-literal=port=5432 \
  --from-literal=dbPaving=bowmark_reports_paving \
  --from-literal=dbConcrete=bowmark_reports_concrete
```

> **Important**: The PostgreSQL user password must be synced with the database itself. If you rotate the secret, also run:
> ```bash
> NEW_PASS=$(kubectl get secret postgres -o jsonpath='{.data.password}' | base64 -d)
> kubectl exec postgres-0 -- psql -U bowmark -d bowmark_reports_paving \
>   -c "ALTER USER bowmark PASSWORD '$NEW_PASS';"
> ```
> Then restart all deployments that use the secret:
> ```bash
> kubectl rollout restart deployment/server-deployment deployment/server-concrete-deployment \
>   deployment/worker-deployment deployment/worker-concrete-deployment \
>   deployment/consumer-deployment deployment/consumer-concrete-deployment
> ```

### `rabbitmq`
```bash
kubectl create secret generic rabbitmq \
  --from-literal=user=bowmark \
  --from-literal=password="$(openssl rand -hex 32)" \
  --from-literal=host=rabbitmq \
  --from-literal=port=5672 \
  --from-literal=vhost=bowmark \
  --from-literal=vhostConcrete=bowmark-concrete
```

### `paving`
```bash
kubectl create secret generic paving \
  --from-literal=mongoURI='mongodb+srv://...'
```

### `concrete`
```bash
kubectl create secret generic concrete \
  --from-literal=mongoURI='mongodb+srv://...'
```

### `general`
```bash
kubectl create secret generic general \
  --from-literal=jwtSecret='<JWT_SECRET>'
```

### `spaces`
```bash
kubectl create secret generic spaces \
  --from-literal=name='<SPACES_BUCKET_NAME>' \
  --from-literal=region='<REGION>' \
  --from-literal=key='<ACCESS_KEY>' \
  --from-literal=secret='<SECRET_KEY>'
```

### `email`
```bash
kubectl create secret generic email \
  --from-literal=email='<FROM_EMAIL>' \
  --from-literal=username='<SMTP_USER>' \
  --from-literal=password='<SMTP_PASS>' \
  --from-literal=host='<SMTP_HOST>' \
  --from-literal=port='<SMTP_PORT>'
```

### `search`
```bash
kubectl create secret generic search \
  --from-literal=host='<MEILISEARCH_HOST>' \
  --from-literal=apiKey='<MEILISEARCH_API_KEY>'
```

## CI/CD Pipeline

**CircleCI** (`.circleci/config.yml`) triggers on pushes to `master` only.

### Build Phase
1. Build 3 Docker images: `bow-mark-server`, `bow-mark-client`, `bow-mark-concrete-client`
2. Tag with both `latest` and `$CIRCLE_SHA1`
3. Push to Docker Hub (`itsdevin/`)

### Deploy Phase (`scripts/ci-deploy.sh`)
1. Run `envsubst` to replace `$COMMIT_SHA1` in all deployment YAMLs (server, worker, consumer, client)
2. Auth to DigitalOcean via `doctl`, mint short-lived kubeconfig
3. Create/update `pg-migrations` ConfigMap from `db/migrations/` SQL files
4. `kubectl apply -f ./k8s/` applies all manifests

> **Note**: `envsubst` is only run on deployment files. StatefulSets, CronJobs, and other manifests contain shell variables intended for runtime (e.g. `$PGPASSWORD` in backup scripts) that must not be substituted at deploy time.

### Rollback
Kubernetes retains the previous ReplicaSet, so rollback is instant:
```bash
kubectl rollout undo deployment/server-deployment
kubectl rollout undo deployment/server-concrete-deployment
# etc.
```
For a full revert: `git revert -m 1 <merge-commit-sha>` and push to master — CI redeploys automatically.

## Automated Backups

**Manifest**: `k8s/pg-backup-cronjob.yaml`

- **Schedule**: Daily at 08:00 UTC
- **Process**: `pg_dump -Fc` both PG databases, upload to DigitalOcean Spaces
- **Destination**: `s3://<SPACES_NAME>/pg-backups/<db_name>/`
- **Retention**: 30 days (script-based cleanup + Spaces lifecycle rule on `pg-backups/` prefix for 35 days as safety net)
- **Concurrency**: `Forbid` (prevents overlapping runs)
- **Credentials**: `postgres` + `spaces` Secrets

### Manual Backup
```bash
kubectl create job --from=cronjob/pg-backup pg-backup-manual
kubectl logs -f job/pg-backup-manual
kubectl delete job pg-backup-manual
```

### Restore from Backup
```bash
# Download dump from Spaces
AWS_ACCESS_KEY_ID=<KEY> AWS_SECRET_ACCESS_KEY=<SECRET> \
aws s3 cp s3://<SPACES_NAME>/pg-backups/bowmark_reports_paving/<dump_file>.pgdump /tmp/restore.pgdump \
  --endpoint-url https://<REGION>.digitaloceanspaces.com

# Port-forward PostgreSQL
kubectl port-forward statefulset/postgres 5432:5432

# Restore (in another terminal)
PGPASSWORD=<PW> pg_restore -h localhost -U bowmark \
  -d bowmark_reports_paving --clean --if-exists /tmp/restore.pgdump
```

## Nightly Restarts

**Manifest**: `k8s/nightly-worker-restart.yaml`

CronJob at 07:00 UTC restarts workers and consumers to clear memory and stale connections:
- `worker-deployment`
- `worker-concrete-deployment`
- `consumer-deployment`
- `consumer-concrete-deployment`

## Database Migrations

Migrations live in `db/migrations/` and are packaged into the `pg-migrations` ConfigMap during each CI deploy.

Consumer init containers run `dbmate up` against their respective database before starting. Idempotent — already-applied migrations are skipped.

### Adding a New Migration
1. Create `db/migrations/YYYYMMDDHHMMSS_description.sql`
2. Add `-- migrate:up` and `-- migrate:down` sections
3. Merge to `master` — CI updates the ConfigMap, consumers apply the migration on next deploy

## Initial Backfill

The consumers handle ongoing sync. Existing MongoDB data requires a one-time backfill to populate PostgreSQL. Both can run in parallel (~20 min each):

```bash
IMAGE=$(kubectl get deployment server-deployment \
  -o jsonpath='{.spec.template.spec.containers[0].image}')

# Paving
kubectl run backfill-paving --restart=Never --image="$IMAGE" \
  --overrides='{
    "spec": {
      "nodeSelector": {"doks.digitalocean.com/node-pool": "default-pool"},
      "containers": [{
        "name": "backfill-paving",
        "image": "'"$IMAGE"'",
        "command": ["node", "dist/scripts/backfill-postgres.js"],
        "env": [
          {"name": "NODE_ENV", "value": "production"},
          {"name": "MONGO_URI", "valueFrom": {"secretKeyRef": {"name": "paving", "key": "mongoURI"}}},
          {"name": "POSTGRES_HOST", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "host"}}},
          {"name": "POSTGRES_PORT", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "port"}}},
          {"name": "POSTGRES_USER", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "user"}}},
          {"name": "POSTGRES_PASSWORD", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "password"}}},
          {"name": "POSTGRES_DB", "value": "bowmark_reports_paving"}
        ]
      }],
      "restartPolicy": "Never"
    }
  }'

# Concrete
kubectl run backfill-concrete --restart=Never --image="$IMAGE" \
  --overrides='{
    "spec": {
      "nodeSelector": {"doks.digitalocean.com/node-pool": "default-pool"},
      "containers": [{
        "name": "backfill-concrete",
        "image": "'"$IMAGE"'",
        "command": ["node", "dist/scripts/backfill-postgres.js"],
        "env": [
          {"name": "NODE_ENV", "value": "production"},
          {"name": "MONGO_URI", "valueFrom": {"secretKeyRef": {"name": "concrete", "key": "mongoURI"}}},
          {"name": "POSTGRES_HOST", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "host"}}},
          {"name": "POSTGRES_PORT", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "port"}}},
          {"name": "POSTGRES_USER", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "user"}}},
          {"name": "POSTGRES_PASSWORD", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "password"}}},
          {"name": "POSTGRES_DB", "value": "bowmark_reports_concrete"}
        ]
      }],
      "restartPolicy": "Never"
    }
  }'

# Tail progress
kubectl logs -f backfill-paving
kubectl logs -f backfill-concrete

# Clean up when complete
kubectl delete pod backfill-paving backfill-concrete
```

## Ingress & TLS

**Manifest**: `k8s/ingress-service.yaml`

| Host | Routes to |
|------|-----------|
| `app.bowmark.ca` | Paving client (3000) + server (8080) |
| `paving.bowmark.ca` | Paving client (3000) + server (8080) |
| `concrete.bowmark.ca` | Concrete client (3001) + server (8081) |

- Nginx Ingress + cert-manager (Let's Encrypt)
- TLS cert covers all three hosts (`bow-mark-tls` Secret)
- Max body size: 100MB (file uploads)
- Proxy timeouts: 600s

## First-Time Deployment Runbook

### 1. Generate and Store Passwords
```bash
# Generate — use hex to avoid URL-unsafe characters
PG_PASS=$(openssl rand -hex 32)
RMQ_PASS=$(openssl rand -hex 32)

# Save to 1Password before proceeding
op item create --category login --title "Bow-Mark Production K8s" --vault "Private" \
  "postgres-password[password]=$PG_PASS" \
  "rabbitmq-password[password]=$RMQ_PASS"
```

### 2. Create All Secrets
Run the commands in the [Kubernetes Secrets](#kubernetes-secrets) section above, pulling values from 1Password:
```bash
op read "op://Private/Bow-Mark Production K8s/postgres-password"
op read "op://Private/Bow-Mark Production K8s/rabbitmq-password"
```

### 3. Deploy Infrastructure
```bash
kubectl apply -f k8s/postgres-statefulset.yaml -f k8s/rabbitmq-statefulset.yaml

# Wait for PVCs and pods
kubectl get pvc -w
kubectl get pods -w
```

### 4. Verify Infrastructure
```bash
# PostgreSQL — list databases (should see bowmark_reports_paving + bowmark_reports_concrete)
kubectl exec postgres-0 -- psql -U bowmark -d bowmark_reports_paving -c "\l"

# RabbitMQ — list vhosts (should see bowmark + bowmark-concrete)
kubectl exec rabbitmq-0 -- rabbitmqctl list_vhosts
```

### 5. Merge to Master
CI builds images, creates the `pg-migrations` ConfigMap, and deploys all services.

### 6. Run Initial Backfill
See [Initial Backfill](#initial-backfill) section above.

### 7. Verify Everything
```bash
# All pods running
kubectl get pods

# Consumers connected and waiting
kubectl logs -l component=consumer --tail=5
kubectl logs -l component=consumer-concrete --tail=5

# PostgreSQL has data post-backfill
kubectl exec postgres-0 -- psql -U bowmark -d bowmark_reports_paving \
  -c "SELECT COUNT(*) FROM fact_material_shipment;"

# Trigger a manual backup to confirm Spaces access
kubectl create job --from=cronjob/pg-backup pg-backup-verify
kubectl logs -f job/pg-backup-verify
kubectl delete job pg-backup-verify
```

## Troubleshooting

### Pods stuck in Pending
```bash
kubectl describe pod <pod-name>
# Look for "Insufficient cpu/memory" — autoscaler should add a node within ~3 min
# Node pool max is 6; if already at 6, reduce resource requests or scale the pool
kubectl get nodes
```

### Consumer CrashLoopBackOff
```bash
# Check init container (migrations)
kubectl logs deployment/consumer-deployment -c migrate

# Check main container
kubectl logs deployment/consumer-deployment -c consumer

# Common causes:
# - "password authentication failed" → secret was rotated but PG user wasn't updated (see postgres secret section)
# - "ENOTFOUND rabbitmq" → RabbitMQ pod is not Ready yet; check kubectl get pod rabbitmq-0
# - "InvalidImageName" → deployment was applied directly without envsubst; patch with:
#   kubectl set image deployment/consumer-deployment consumer=itsdevin/bow-mark-server:<SHA>
```

### RabbitMQ not Ready (0/1)
```bash
# Check probe failures
kubectl describe pod rabbitmq-0 | grep -A 3 Unhealthy

# "command timed out" → probe timeoutSeconds too low (should be 10s)
# Verify probe config on the running pod:
kubectl get pod rabbitmq-0 -o jsonpath='{.spec.containers[0].readinessProbe}'

# Check logs
kubectl logs rabbitmq-0 --tail=30

# Verify both vhosts exist
kubectl exec rabbitmq-0 -- rabbitmqctl list_vhosts
```

### PostgreSQL connection issues
```bash
# Check pod and PVC
kubectl describe pod postgres-0
kubectl get pvc

# Connect via local socket (no password needed from inside pod)
kubectl exec postgres-0 -- psql -U bowmark -d bowmark_reports_paving -c "SELECT 1;"

# Test network connection from another pod
kubectl run pg-test --rm -it --restart=Never --image=postgres:16 \
  -- psql -h postgres -U bowmark -d bowmark_reports_paving -c "SELECT 1;"
```

### Migration failures
```bash
# Check init container logs
kubectl logs deployment/consumer-deployment -c migrate

# Check ConfigMap has the migration files
kubectl get configmap pg-migrations -o yaml | grep "^  [0-9]"

# Check migration status manually
kubectl run dbmate-status --rm -it --restart=Never \
  --image=ghcr.io/amacneil/dbmate:2 \
  --env="DATABASE_URL=postgres://bowmark:<PW>@postgres:5432/bowmark_reports_paving?sslmode=disable" \
  -- status
```

### Cross-app events (both consumers triggered)
Both consumers connect to the same RabbitMQ instance but use **separate vhosts** (`bowmark` vs `bowmark-concrete`), so events are fully isolated. If cross-triggering reappears, verify:
```bash
# Confirm vhost assignment per deployment
kubectl get deployment consumer-deployment -o jsonpath='{.spec.template.spec.containers[0].env}' \
  | python3 -m json.tool | grep -A 2 RABBITMQ_VHOST
kubectl get deployment consumer-concrete-deployment -o jsonpath='{.spec.template.spec.containers[0].env}' \
  | python3 -m json.tool | grep -A 2 RABBITMQ_VHOST
```

## File Reference

| File | Purpose |
|------|---------|
| `k8s/postgres-statefulset.yaml` | PostgreSQL StatefulSet + 10Gi PVC + init ConfigMap + headless Service |
| `k8s/rabbitmq-statefulset.yaml` | RabbitMQ StatefulSet + 5Gi PVC + vhost ConfigMap + headless Service |
| `k8s/consumer-deployment.yaml` | Paving consumer (dbmate init container, `bowmark` vhost) |
| `k8s/consumer-concrete-deployment.yaml` | Concrete consumer (dbmate init container, `bowmark-concrete` vhost) |
| `k8s/server-deployment.yaml` | Paving API server (2 replicas, cpu-optimized pool) |
| `k8s/server-concrete-deployment.yaml` | Concrete API server (2 replicas, cpu-optimized pool) |
| `k8s/worker-deployment.yaml` | Paving background worker |
| `k8s/worker-concrete-deployment.yaml` | Concrete background worker |
| `k8s/client-deployment.yaml` | Paving Next.js frontend |
| `k8s/client-concrete-deployment.yaml` | Concrete Next.js frontend |
| `k8s/ingress-service.yaml` | Nginx Ingress routing + TLS (3 hosts) |
| `k8s/pg-backup-cronjob.yaml` | Daily PG backup to DigitalOcean Spaces |
| `k8s/nightly-worker-restart.yaml` | Nightly restart of workers + consumers |
| `k8s/deployment-manager-role.yaml` | RBAC allowing default ServiceAccount to restart deployments |
| `k8s/*-cluster-ip-service.yaml` | ClusterIP services for internal routing |
| `scripts/ci-deploy.sh` | CI deploy: envsubst + ConfigMap creation + kubectl apply |
| `.circleci/config.yml` | CircleCI pipeline (build on every push, deploy on master only) |
| `db/migrations/` | PostgreSQL migration SQL files (dbmate format) |
