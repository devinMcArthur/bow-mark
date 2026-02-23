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
        │              (StatefulSet + PVC)                  │
        └─────────────────────┬────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼──────┐    ┌───────▼────────┐
              │ Consumer   │    │ Consumer       │
              │ (Paving)   │    │ (Concrete)     │
              └─────┬──────┘    └───────┬────────┘
                    │                   │
              ┌─────▼───────────────────▼──────┐
              │          PostgreSQL             │
              │       (StatefulSet + PVC)       │
              │  bowmark_reports_paving         │
              │  bowmark_reports_concrete       │
              └────────────────────────────────┘
```

## Node Pools

| Pool | Workloads |
|------|-----------|
| `dedicated-cpu-optimized` | Server (Paving x2), Server (Concrete x2) |
| `default-pool` | Workers, Consumers, PostgreSQL, RabbitMQ, Clients |

## Services

### MongoDB (Atlas - Managed)
- Hosted on MongoDB Atlas (external)
- Connection strings in `paving` and `concrete` Secrets (`mongoURI` key)

### PostgreSQL (Self-hosted)
- **Manifest**: `k8s/postgres-statefulset.yaml`
- **Type**: StatefulSet (1 replica)
- **Storage**: 10Gi PVC on `do-block-storage`
- **Image**: `postgres:16`
- **Databases**: `bowmark_reports_paving` (auto-created via `POSTGRES_DB`), `bowmark_reports_concrete` (created by init script)
- **Credentials**: `postgres` Secret
- **Health checks**: `pg_isready`
- **Data path**: `/var/lib/postgresql/data/pgdata` (subdirectory required for PVC mounts)

### RabbitMQ (Self-hosted)
- **Manifest**: `k8s/rabbitmq-statefulset.yaml`
- **Type**: StatefulSet (1 replica)
- **Storage**: 5Gi PVC on `do-block-storage`
- **Image**: `rabbitmq:3-management`
- **Credentials**: `rabbitmq` Secret
- **Health checks**: `rabbitmq-diagnostics ping` (readiness), `rabbitmq-diagnostics status` (liveness)
- **Management UI**: Port 15672 (cluster-internal only)

### Meilisearch (External)
- Connection via `search` Secret (`host`, `apiKey`)
- Used for full-text search in the app

## Deployments

All deployments use image `itsdevin/bow-mark-server:$COMMIT_SHA1` (server) or `itsdevin/bow-mark-client:$COMMIT_SHA1` / `itsdevin/bow-mark-concrete-client:$COMMIT_SHA1` (clients).

| Deployment | Replicas | Node Pool | Notes |
|------------|----------|-----------|-------|
| `server-deployment` | 2 | cpu-optimized | Paving API (port 8080) |
| `server-concrete-deployment` | 2 | cpu-optimized | Concrete API (port 8081) |
| `worker-deployment` | 1 | default-pool | Paving background jobs |
| `worker-concrete-deployment` | 1 | default-pool | Concrete background jobs |
| `consumer-deployment` | 1 | default-pool | Paving MongoDB->PG sync |
| `consumer-concrete-deployment` | 1 | default-pool | Concrete MongoDB->PG sync |
| `client-deployment` | 1 | default-pool | Paving Next.js frontend |
| `client-concrete-deployment` | 1 | default-pool | Concrete Next.js frontend |

### Consumer Details
- **Command**: `node dist/consumer/index.js` (compiled JS, not ts-node)
- **Init container**: `ghcr.io/amacneil/dbmate:2` runs PostgreSQL migrations before the consumer starts
- **Migrations source**: `pg-migrations` ConfigMap (created from `db/migrations/` in CI)
- Connects to MongoDB (read source), RabbitMQ (receive events), PostgreSQL (write reporting data)

## Kubernetes Secrets

All secrets must be created manually before first deployment.

### `postgres`
```bash
kubectl create secret generic postgres \
  --from-literal=user=bowmark \
  --from-literal=password='<GENERATED_PASSWORD>' \
  --from-literal=host=postgres \
  --from-literal=port=5432 \
  --from-literal=dbPaving=bowmark_reports_paving \
  --from-literal=dbConcrete=bowmark_reports_concrete
```

### `rabbitmq`
```bash
kubectl create secret generic rabbitmq \
  --from-literal=user=bowmark \
  --from-literal=password='<GENERATED_PASSWORD>' \
  --from-literal=host=rabbitmq \
  --from-literal=port=5672 \
  --from-literal=vhost=bowmark
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

**CircleCI** (`.circleci/config.yml`) triggers on pushes to `master`.

### Build Phase
1. Build 3 Docker images: `bow-mark-server`, `bow-mark-client`, `bow-mark-concrete-client`
2. Tag with `latest` and `$CIRCLE_SHA1`
3. Push to Docker Hub

### Deploy Phase (`scripts/ci-deploy.sh`)
1. `envsubst` replaces `$COMMIT_SHA1` in deployment YAMLs:
   - Server (paving + concrete)
   - Worker (paving + concrete)
   - Consumer (paving + concrete)
   - Client (paving + concrete)
2. Auth to DigitalOcean and mint short-lived kubeconfig
3. Create/update `pg-migrations` ConfigMap from `db/migrations/` SQL files
4. `kubectl apply -f ./k8s/` applies all manifests

**Important**: `envsubst` is only run on deployment files that reference `$COMMIT_SHA1`. StatefulSets, CronJobs, and other manifests contain runtime shell variables (like `$PGPASSWORD`) that must NOT be substituted at deploy time.

## Automated Backups

**Manifest**: `k8s/pg-backup-cronjob.yaml`

- **Schedule**: Daily at 08:00 UTC
- **Process**: `pg_dump -Fc` both PG databases, upload to DigitalOcean Spaces
- **Destination**: `s3://<SPACES_NAME>/pg-backups/<db_name>/`
- **Retention**: 30 days (auto-cleanup of older dumps)
- **Concurrency**: `Forbid` (prevents overlapping backups)
- **Credentials**: `postgres` + `spaces` Secrets

### Manual Backup Test
```bash
kubectl create job --from=cronjob/pg-backup pg-backup-test
kubectl logs -f job/pg-backup-test
```

### Restore from Backup
```bash
# Download dump from Spaces
aws s3 cp s3://<SPACES_NAME>/pg-backups/bowmark_reports_paving/<dump_file>.pgdump /tmp/restore.pgdump \
  --endpoint-url https://<REGION>.digitaloceanspaces.com

# Port-forward PostgreSQL
kubectl port-forward statefulset/postgres 5432:5432

# Restore (in another terminal)
pg_restore -h localhost -U bowmark -d bowmark_reports_paving --clean --if-exists /tmp/restore.pgdump
```

## Nightly Restarts

**Manifest**: `k8s/nightly-worker-restart.yaml`

CronJob at 07:00 UTC rolls out restarts for workers and consumers to clear accumulated memory and stale connections.

## Database Migrations

Migrations live in `db/migrations/` and are packaged into a `pg-migrations` ConfigMap during CI deploy.

Consumer init containers run `dbmate up` against their respective database before the consumer process starts. This is idempotent - migrations that have already run are skipped.

### Adding a New Migration
1. Create a new SQL file in `db/migrations/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
2. Include `-- migrate:up` and `-- migrate:down` sections (dbmate format)
3. Push to `master` - CI will update the ConfigMap and consumers will run the migration on next deploy

## Ingress & TLS

**Manifest**: `k8s/ingress-service.yaml`

- Nginx Ingress controller with cert-manager (Let's Encrypt)
- `app.bowmark.ca` / `paving.bowmark.ca` -> Paving client + server
- `concrete.bowmark.ca` -> Concrete client + server
- Max body size: 100MB (for file uploads)
- Proxy timeouts: 600s

## First-Time Deployment Runbook

### 1. Generate Passwords
```bash
openssl rand -base64 32  # For PostgreSQL
openssl rand -base64 32  # For RabbitMQ
```

### 2. Create All Secrets
See [Kubernetes Secrets](#kubernetes-secrets) section above.

### 3. Deploy Infrastructure First
```bash
kubectl apply -f k8s/postgres-statefulset.yaml -f k8s/rabbitmq-statefulset.yaml
```
Wait for PVCs to provision and pods to be ready:
```bash
kubectl get pvc -w
kubectl get pods -w
```

### 4. Verify Infrastructure
```bash
# PostgreSQL - should list both databases
kubectl exec postgres-0 -- psql -U bowmark -l

# RabbitMQ - should show node running
kubectl exec rabbitmq-0 -- rabbitmq-diagnostics status
```

### 5. Push to Master
CI builds images, runs migrations, deploys all services.

### 6. Run Initial Backfill
The consumers will handle ongoing sync, but existing MongoDB data needs a one-time backfill:
```bash
# Paving backfill (~20 minutes)
kubectl run backfill-paving --rm -it --restart=Never \
  --image="itsdevin/bow-mark-server:<COMMIT_SHA>" \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "backfill-paving",
        "image": "itsdevin/bow-mark-server:<COMMIT_SHA>",
        "command": ["node", "dist/scripts/backfill-postgres.js"],
        "env": [
          {"name": "MONGO_URI", "valueFrom": {"secretKeyRef": {"name": "paving", "key": "mongoURI"}}},
          {"name": "POSTGRES_HOST", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "host"}}},
          {"name": "POSTGRES_PORT", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "port"}}},
          {"name": "POSTGRES_USER", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "user"}}},
          {"name": "POSTGRES_PASSWORD", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "password"}}},
          {"name": "POSTGRES_DB", "value": "bowmark_reports_paving"}
        ]
      }]
    }
  }'

# Concrete backfill (~20 minutes, can run in parallel)
kubectl run backfill-concrete --rm -it --restart=Never \
  --image="itsdevin/bow-mark-server:<COMMIT_SHA>" \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "backfill-concrete",
        "image": "itsdevin/bow-mark-server:<COMMIT_SHA>",
        "command": ["node", "dist/scripts/backfill-postgres.js"],
        "env": [
          {"name": "MONGO_URI", "valueFrom": {"secretKeyRef": {"name": "concrete", "key": "mongoURI"}}},
          {"name": "POSTGRES_HOST", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "host"}}},
          {"name": "POSTGRES_PORT", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "port"}}},
          {"name": "POSTGRES_USER", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "user"}}},
          {"name": "POSTGRES_PASSWORD", "valueFrom": {"secretKeyRef": {"name": "postgres", "key": "password"}}},
          {"name": "POSTGRES_DB", "value": "bowmark_reports_concrete"}
        ]
      }]
    }
  }'
```

### 7. Verify Everything
```bash
# All pods running
kubectl get pods

# Consumer processing messages
kubectl logs -l component=consumer --tail=20
kubectl logs -l component=consumer-concrete --tail=20

# PG has data
kubectl exec postgres-0 -- psql -U bowmark -d bowmark_reports_paving \
  -c "SELECT COUNT(*) FROM fact_material_shipment;"

# Test backup CronJob
kubectl create job --from=cronjob/pg-backup pg-backup-test
```

## Troubleshooting

### Consumer not processing messages
```bash
# Check consumer logs
kubectl logs deployment/consumer-deployment --tail=50

# Check RabbitMQ queues (are messages piling up?)
kubectl exec rabbitmq-0 -- rabbitmqctl list_queues name messages consumers

# Restart consumer
kubectl rollout restart deployment consumer-deployment
```

### PostgreSQL connection issues
```bash
# Check PG pod
kubectl describe pod postgres-0
kubectl logs postgres-0

# Verify PVC is bound
kubectl get pvc

# Test connection from inside cluster
kubectl run pg-test --rm -it --restart=Never --image=postgres:16 \
  -- psql -h postgres -U bowmark -d bowmark_reports_paving -c "SELECT 1;"
```

### Migration failures
```bash
# Check init container logs
kubectl logs deployment/consumer-deployment -c migrate

# Verify ConfigMap has migration files
kubectl get configmap pg-migrations -o yaml | head -20

# Run migration manually
kubectl run migrate-manual --rm -it --restart=Never \
  --image=ghcr.io/amacneil/dbmate:2 \
  -- dbmate --url "postgres://bowmark:<PW>@postgres:5432/bowmark_reports_paving?sslmode=disable" status
```

### RabbitMQ issues
```bash
# Check RabbitMQ status
kubectl exec rabbitmq-0 -- rabbitmq-diagnostics status

# List exchanges and bindings
kubectl exec rabbitmq-0 -- rabbitmqctl list_exchanges
kubectl exec rabbitmq-0 -- rabbitmqctl list_bindings

# Check for unacknowledged messages
kubectl exec rabbitmq-0 -- rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

## File Reference

| File | Purpose |
|------|---------|
| `k8s/postgres-statefulset.yaml` | PostgreSQL StatefulSet + PVC + init ConfigMap + Service |
| `k8s/rabbitmq-statefulset.yaml` | RabbitMQ StatefulSet + PVC + Service |
| `k8s/consumer-deployment.yaml` | Paving consumer (with dbmate init container) |
| `k8s/consumer-concrete-deployment.yaml` | Concrete consumer |
| `k8s/server-deployment.yaml` | Paving API server (2 replicas) |
| `k8s/server-concrete-deployment.yaml` | Concrete API server (2 replicas) |
| `k8s/worker-deployment.yaml` | Paving background worker |
| `k8s/worker-concrete-deployment.yaml` | Concrete background worker |
| `k8s/client-deployment.yaml` | Paving Next.js client |
| `k8s/client-concrete-deployment.yaml` | Concrete Next.js client |
| `k8s/ingress-service.yaml` | Nginx Ingress routing + TLS |
| `k8s/pg-backup-cronjob.yaml` | Daily PG backup to Spaces |
| `k8s/nightly-worker-restart.yaml` | Nightly worker + consumer restart |
| `k8s/deployment-manager-role.yaml` | RBAC for deployment restarts |
| `k8s/*-cluster-ip-service.yaml` | ClusterIP services for internal routing |
| `scripts/ci-deploy.sh` | CI deploy script (envsubst + kubectl apply) |
| `.circleci/config.yml` | CircleCI build + deploy pipeline |
| `db/migrations/` | PostgreSQL migration SQL files |
