# -*- mode: Python -*-
"""
Bow-Mark Development Environment

Run with: tilt up
Dashboard: http://localhost:10350

Usage:
  tilt up                          # Start with paving (default)
  tilt up -- --app-type=concrete   # Start with concrete

Hot-switch in Tilt UI:
  Click "switch-to-concrete" or "switch-to-paving" in the switching group

This Tiltfile orchestrates the local k8s development environment with:
- App-type switching between paving and concrete databases
- Proper dependency ordering (DBs → migrations → services)
- File watching for migrations (auto re-run + codegen)
- MongoDB + PostgreSQL restore from dump files
- Hot reload for client and server code
"""

# Use minikube's docker daemon so we don't need to push images
# Run: eval $(minikube docker-env) before tilt up
allow_k8s_contexts('minikube')

# ============================================================================
# Configuration
# ============================================================================

config.define_string('app-type', args=False)
config.define_string_list('to-run', args=True)
cfg = config.parse()

APP_TYPE = cfg.get('app-type', 'paving')
APP_NAME_CAPITALIZED = 'Paving' if APP_TYPE == 'paving' else 'Concrete'

# Paths
SERVER_DIR = 'server'
CLIENT_DIR = 'client'
MIGRATIONS_DIR = 'db/migrations'
MONGO_DUMP_DIR = 'dev-data/mongodb-dump'
PG_DUMP_DIR = 'dev-data/postgres-dump'

# Database names
PG_DB_PAVING = 'bowmark_reports_paving'
PG_DB_CONCRETE = 'bowmark_reports_concrete'
PG_CONN_BASE = 'postgres://bowmark:devpassword@localhost:5432'

# Update Tilt UI settings
update_settings(
    max_parallel_updates=4,
    k8s_upsert_timeout_secs=120,
)

# ============================================================================
# Dynamic ConfigMaps (generated from app-type config)
# ============================================================================

# App-config ConfigMap: injected into all app deployments via envFrom
k8s_yaml(blob("""
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  MONGO_URI: "mongodb://mongo:27017/{app_type}"
  POSTGRES_DB: "bowmark_reports_{app_type}"
  APP_NAME: "{app_type}"
  NEXT_PUBLIC_APP_NAME: "{app_name}"
""".format(app_type=APP_TYPE, app_name=APP_NAME_CAPITALIZED)))

# Postgres init script: creates the second database on first startup
# (The first database is created automatically via POSTGRES_DB env var)
k8s_yaml(blob("""
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init-scripts
data:
  create-databases.sh: |
    #!/bin/bash
    set -e
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
      CREATE DATABASE bowmark_reports_concrete;
      GRANT ALL PRIVILEGES ON DATABASE bowmark_reports_concrete TO bowmark;
    EOSQL
"""))

# ============================================================================
# Infrastructure Services (Databases, Message Queue, Search)
# ============================================================================

# Deploy infrastructure first - these have no dependencies
k8s_yaml([
    'k8s-dev/mongo.yaml',
    'k8s-dev/postgres.yaml',
    'k8s-dev/rabbitmq.yaml',
    'k8s-dev/meilisearch.yaml',
])

# Give friendly names and configure readiness
k8s_resource('mongo', labels=['infrastructure'])
k8s_resource('postgres', labels=['infrastructure'])
k8s_resource('rabbitmq', labels=['infrastructure'])
k8s_resource('meilisearch', labels=['infrastructure'])

# ============================================================================
# Database GUIs
# ============================================================================

k8s_yaml([
    'k8s-dev/mongo-express.yaml',
    'k8s-dev/adminer.yaml',
])

# Mongo Express - MongoDB web UI
k8s_resource(
    'mongo-express',
    resource_deps=['mongo'],
    port_forwards=['8081:8081'],
    labels=['db-tools'],
    links=['http://localhost:8081'],
)

# Adminer - PostgreSQL web UI (lightweight, fast)
# URL pre-fills server, username, and database - just enter password: devpassword
k8s_resource(
    'adminer',
    resource_deps=['postgres'],
    port_forwards=['8083:8080'],
    labels=['db-tools'],
    links=[
        'http://localhost:8083/?pgsql=postgres&username=bowmark&db=bowmark_reports_paving',
        'http://localhost:8083/?pgsql=postgres&username=bowmark&db=bowmark_reports_concrete',
    ],
)

# ============================================================================
# Database Setup Tasks
# ============================================================================

# Restore MongoDB from dump on startup (restores both paving and concrete)
# Only runs if MongoDB is empty (no databases with collections)
local_resource(
    'restore-mongo',
    cmd='''
        DUMP_DIR="dev-data/mongodb-dump"

        # Check if dump exists
        if [ ! -d "$DUMP_DIR" ] || [ -z "$(ls -A $DUMP_DIR 2>/dev/null)" ]; then
            echo "No MongoDB dump found at $DUMP_DIR - skipping restore"
            exit 0
        fi

        # Wait for mongo to accept connections
        echo "Waiting for MongoDB to accept connections..."
        for i in $(seq 1 30); do
            POD=$(kubectl get pods -l app=mongo -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
            if [ -n "$POD" ] && kubectl exec "$POD" -- mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
                echo "MongoDB is ready"
                break
            fi
            echo "Waiting... ($i/30)"
            sleep 2
        done

        if [ -z "$POD" ]; then
            echo "Error: Could not find mongo pod"
            exit 1
        fi

        # Check if paving database already has data (proxy for "already restored")
        PAVING_COUNT=$(kubectl exec "$POD" -- mongosh paving --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "0")
        CONCRETE_COUNT=$(kubectl exec "$POD" -- mongosh concrete --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "0")

        if [ "$PAVING_COUNT" -gt 0 ] && [ "$CONCRETE_COUNT" -gt 0 ]; then
            echo "MongoDB already has data (paving: $PAVING_COUNT collections, concrete: $CONCRETE_COUNT collections)"
            echo "To force restore, use: tilt trigger restore-mongo-force"
            exit 0
        fi

        echo "Restoring MongoDB from dump (both paving and concrete databases)..."
        kubectl cp "$DUMP_DIR" "$POD:/tmp/mongodb-dump"
        kubectl exec "$POD" -- mongorestore --drop /tmp/mongodb-dump
        kubectl exec "$POD" -- rm -rf /tmp/mongodb-dump
        echo "MongoDB restore complete!"
    ''',
    resource_deps=['mongo'],
    labels=['setup'],
)

# Force restore MongoDB (manual trigger - wipes existing data)
local_resource(
    'restore-mongo-force',
    cmd='''
        DUMP_DIR="dev-data/mongodb-dump"

        if [ ! -d "$DUMP_DIR" ] || [ -z "$(ls -A $DUMP_DIR 2>/dev/null)" ]; then
            echo "No MongoDB dump found at $DUMP_DIR"
            exit 1
        fi

        POD=$(kubectl get pods -l app=mongo -o jsonpath='{.items[0].metadata.name}')
        if [ -z "$POD" ]; then
            echo "Error: Could not find mongo pod"
            exit 1
        fi

        echo "Force restoring MongoDB from dump (this will drop existing data)..."
        kubectl cp "$DUMP_DIR" "$POD:/tmp/mongodb-dump"
        kubectl exec "$POD" -- mongorestore --drop /tmp/mongodb-dump
        kubectl exec "$POD" -- rm -rf /tmp/mongodb-dump
        echo "MongoDB restore complete!"
    ''',
    resource_deps=['mongo'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['setup'],
)

# Run Postgres migrations on BOTH databases
# Re-runs automatically when migration files change
local_resource(
    'db-migrate',
    cmd='''
        cd server && \
        echo "Running migrations on bowmark_reports_paving..." && \
        DATABASE_URL="postgres://bowmark:devpassword@localhost:5432/bowmark_reports_paving?sslmode=disable" npm run db:migrate && \
        echo "Running migrations on bowmark_reports_concrete..." && \
        DATABASE_URL="postgres://bowmark:devpassword@localhost:5432/bowmark_reports_concrete?sslmode=disable" npm run db:migrate && \
        echo "Migrations complete on both databases!"
    ''',
    deps=[MIGRATIONS_DIR],
    resource_deps=['postgres'],
    labels=['setup'],
)

# Restore PostgreSQL from dumps on startup (restores both paving and concrete)
# Runs after migrations so schema exists, then loads data from dumps
local_resource(
    'restore-postgres',
    cmd='''
        PG_POD=$(kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}')
        if [ -z "$PG_POD" ]; then
            echo "Error: Could not find postgres pod"
            exit 1
        fi

        for APP_TYPE in paving concrete; do
            DB_NAME="bowmark_reports_$APP_TYPE"
            DUMP_FILE="dev-data/postgres-dump/$APP_TYPE/dump.pgdump"

            if [ ! -f "$DUMP_FILE" ]; then
                echo "No PostgreSQL dump for $APP_TYPE at $DUMP_FILE - skipping"
                echo "  Run backfill + save-pg-state to create one"
                continue
            fi

            # Check if database already has data (skip if so)
            ROW_COUNT=$(kubectl exec "$PG_POD" -- psql -U bowmark -d "$DB_NAME" -tAc \
                "SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables" 2>/dev/null || echo "0")

            if [ "$ROW_COUNT" -gt 0 ]; then
                echo "PostgreSQL $APP_TYPE already has data ($ROW_COUNT rows) - skipping restore"
                continue
            fi

            echo "Restoring PostgreSQL data for $APP_TYPE..."
            DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
            echo "  Dump file: $DUMP_FILE ($DUMP_SIZE)"

            # Copy dump to pod and restore
            kubectl cp "$DUMP_FILE" "$PG_POD:/tmp/pg-dump.pgdump"
            kubectl exec "$PG_POD" -- pg_restore -U bowmark -d "$DB_NAME" \
                --clean --if-exists --no-owner --no-privileges /tmp/pg-dump.pgdump 2>/dev/null || true
            kubectl exec "$PG_POD" -- rm -f /tmp/pg-dump.pgdump
            echo "PostgreSQL restore for $APP_TYPE complete!"
        done
    ''',
    resource_deps=['postgres', 'db-migrate'],
    labels=['setup'],
)

# ============================================================================
# Application Images
# ============================================================================

# Server image with hot-reload file sync
docker_build(
    'itsdevin/bow-mark-server',
    context=SERVER_DIR,
    dockerfile=SERVER_DIR + '/Dockerfile.dev',
    live_update=[
        # Sync source files without rebuilding image
        sync(SERVER_DIR + '/src', '/usr/app/src'),
        sync(SERVER_DIR + '/package.json', '/usr/app/package.json'),
    ],
)

# Client image with hot-reload file sync
docker_build(
    'itsdevin/bow-mark-client',
    context=CLIENT_DIR,
    dockerfile=CLIENT_DIR + '/Dockerfile.dev',
    live_update=[
        sync(CLIENT_DIR + '/src', '/usr/src/app/src'),
        sync(CLIENT_DIR + '/public', '/usr/src/app/public'),
        sync(CLIENT_DIR + '/package.json', '/usr/src/app/package.json'),
    ],
)

# ============================================================================
# Application Services
# ============================================================================

k8s_yaml([
    'k8s-dev/server-deployment.yaml',
    'k8s-dev/worker-deployment.yaml',
    'k8s-dev/consumer-deployment.yaml',
    'k8s-dev/client-deployment.yaml',
    'k8s-dev/server-cluster-ip-service.yaml',
    'k8s-dev/client-cluster-ip-service.yaml',
    'k8s-dev/ingress.yaml',
])

# Server API - depends on all infrastructure + migrations + data restore
k8s_resource(
    'server-deployment',
    resource_deps=['mongo', 'postgres', 'rabbitmq', 'meilisearch', 'db-migrate', 'restore-mongo', 'restore-postgres'],
    port_forwards=['8080:8080'],
    labels=['app'],
)

# Background worker - same deps as server
k8s_resource(
    'worker-deployment',
    resource_deps=['mongo', 'postgres', 'rabbitmq', 'db-migrate', 'restore-mongo', 'restore-postgres'],
    labels=['app'],
)

# RabbitMQ consumer - needs DBs and RabbitMQ
k8s_resource(
    'consumer-deployment',
    resource_deps=['mongo', 'postgres', 'rabbitmq', 'db-migrate', 'restore-mongo', 'restore-postgres'],
    labels=['app'],
)

# Client - just needs the server API to be available
k8s_resource(
    'client-deployment',
    resource_deps=['server-deployment'],
    port_forwards=['3000:3000'],
    labels=['app'],
)

# ============================================================================
# Additional Port Forwards
# ============================================================================

# MongoDB - for local tools like Compass
k8s_resource('mongo', port_forwards=['27017:27017'])

# Postgres - for local tools like pgAdmin
k8s_resource('postgres', port_forwards=['5432:5432'])

# RabbitMQ - AMQP + Management UI
k8s_resource('rabbitmq', port_forwards=['5672:5672', '15672:15672'])

# ============================================================================
# App-Type Switching (Hot-Switch)
# ============================================================================

# Helper function to generate a switch script
def switch_cmd(target_app_type):
    target_name = 'Paving' if target_app_type == 'paving' else 'Concrete'
    return '''
        TARGET="{target}"
        TARGET_NAME="{target_name}"

        echo "=== Switching to $TARGET_NAME ==="

        # 1. Update the app-config ConfigMap
        echo "Updating ConfigMap..."
        kubectl create configmap app-config \\
            --from-literal=MONGO_URI="mongodb://mongo:27017/$TARGET" \\
            --from-literal=POSTGRES_DB="bowmark_reports_$TARGET" \\
            --from-literal=APP_NAME="$TARGET" \\
            --from-literal=NEXT_PUBLIC_APP_NAME="$TARGET_NAME" \\
            --dry-run=client -o yaml | kubectl apply -f -

        # 2. Purge RabbitMQ queues to prevent stale messages
        echo "Purging RabbitMQ queues..."
        RMQ_POD=$(kubectl get pods -l app=rabbitmq -o jsonpath='{{.items[0].metadata.name}}' 2>/dev/null)
        if [ -n "$RMQ_POD" ]; then
            kubectl exec "$RMQ_POD" -- rabbitmqctl purge_queue sync.daily_report -p bowmark 2>/dev/null || true
            kubectl exec "$RMQ_POD" -- rabbitmqctl purge_queue sync.employee_work -p bowmark 2>/dev/null || true
            kubectl exec "$RMQ_POD" -- rabbitmqctl purge_queue sync.vehicle_work -p bowmark 2>/dev/null || true
            kubectl exec "$RMQ_POD" -- rabbitmqctl purge_queue sync.material_shipment -p bowmark 2>/dev/null || true
            kubectl exec "$RMQ_POD" -- rabbitmqctl purge_queue sync.production -p bowmark 2>/dev/null || true
            kubectl exec "$RMQ_POD" -- rabbitmqctl purge_queue sync.invoice -p bowmark 2>/dev/null || true
            echo "Queues purged"
        fi

        # 3. Restart app deployments to pick up new env vars
        echo "Restarting app deployments..."
        kubectl rollout restart deployment server-deployment worker-deployment consumer-deployment client-deployment

        # 4. Wait for rollouts
        echo "Waiting for rollout..."
        kubectl rollout status deployment server-deployment --timeout=90s
        kubectl rollout status deployment consumer-deployment --timeout=90s
        kubectl rollout status deployment client-deployment --timeout=90s

        echo ""
        echo "=== Switched to $TARGET_NAME! ==="
        echo "  MongoDB: mongodb://mongo:27017/$TARGET"
        echo "  PostgreSQL: bowmark_reports_$TARGET"
    '''.format(target=target_app_type, target_name=target_name)

local_resource(
    'switch-to-paving',
    cmd=switch_cmd('paving'),
    resource_deps=['mongo', 'postgres', 'rabbitmq'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['switching'],
)

local_resource(
    'switch-to-concrete',
    cmd=switch_cmd('concrete'),
    resource_deps=['mongo', 'postgres', 'rabbitmq'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['switching'],
)

# ============================================================================
# Development Utilities
# ============================================================================

# GraphQL codegen for client (run manually when schema changes)
local_resource(
    'client-codegen',
    cmd='cd client && npm run codegen',
    resource_deps=['server-deployment'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['utilities'],
)

# Save MongoDB state to dump files (for committing)
local_resource(
    'save-db-state',
    cmd='./scripts/save-db-state.sh',
    resource_deps=['mongo'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['utilities'],
)

# Save PostgreSQL state to dump files (for committing)
local_resource(
    'save-pg-state',
    cmd='./scripts/save-pg-state.sh',
    resource_deps=['postgres'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['utilities'],
)

# Run PostgreSQL backfill from MongoDB (for initial PG data population)
# Uses the CURRENT app-type's database. After backfill, use save-pg-state to persist.
local_resource(
    'run-backfill',
    cmd='''
        echo "=== Running PostgreSQL Backfill for {app_type} ==="
        echo "This may take 10-20 minutes..."
        cd server && \
        MONGO_URI="mongodb://localhost:27017/{app_type}" \
        POSTGRES_HOST="localhost" \
        POSTGRES_PORT="5432" \
        POSTGRES_USER="bowmark" \
        POSTGRES_PASSWORD="devpassword" \
        POSTGRES_DB="bowmark_reports_{app_type}" \
        DATABASE_URL="postgres://bowmark:devpassword@localhost:5432/bowmark_reports_{app_type}?sslmode=disable" \
        npm run db:backfill
        echo ""
        echo "Backfill complete! Run save-pg-state to persist this data."
    '''.format(app_type=APP_TYPE),
    resource_deps=['mongo', 'postgres', 'db-migrate', 'restore-mongo'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['utilities'],
)
