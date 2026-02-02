# -*- mode: Python -*-
"""
Bow-Mark Development Environment

Run with: tilt up
Dashboard: http://localhost:10350

This Tiltfile orchestrates the local k8s development environment with:
- Proper dependency ordering (DBs → migrations → services)
- File watching for migrations (auto re-run + codegen)
- MongoDB restore from dump files
- Hot reload for client and server code
"""

# Use minikube's docker daemon so we don't need to push images
# Run: eval $(minikube docker-env) before tilt up
allow_k8s_contexts('minikube')

# ============================================================================
# Configuration
# ============================================================================

# Paths
SERVER_DIR = 'server'
CLIENT_DIR = 'client'
MIGRATIONS_DIR = 'db/migrations'
MONGO_DUMP_DIR = 'dev-data/mongodb-dump'

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
    links=['http://localhost:8083/?pgsql=postgres&username=bowmark&db=bowmark_reports'],
)

# ============================================================================
# Database Setup Tasks
# ============================================================================

# Restore MongoDB from dump on startup (only if database is empty)
local_resource(
    'restore-mongo',
    cmd='''
        DUMP_DIR="dev-data/mongodb-dump"
        DB_NAME="paving"

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

        # Check if database already has data
        COLLECTION_COUNT=$(kubectl exec "$POD" -- mongosh "$DB_NAME" --quiet --eval "db.getCollectionNames().length")
        if [ "$COLLECTION_COUNT" -gt 0 ]; then
            echo "Database '$DB_NAME' already has $COLLECTION_COUNT collections - skipping restore"
            echo "To force restore, use: tilt trigger restore-mongo-force"
            exit 0
        fi

        echo "Database is empty - restoring from dump..."
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

# Run Postgres migrations
# Re-runs automatically when migration files change
local_resource(
    'db-migrate',
    cmd='cd server && npm run db:migrate',
    deps=[MIGRATIONS_DIR],
    resource_deps=['postgres'],
    env={
        'DATABASE_URL': 'postgres://bowmark:devpassword@localhost:5432/bowmark_reports?sslmode=disable',
    },
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

# Server API - depends on all infrastructure + migrations
k8s_resource(
    'server-deployment',
    resource_deps=['mongo', 'postgres', 'rabbitmq', 'meilisearch', 'db-migrate'],
    port_forwards=['8080:8080'],
    labels=['app'],
)

# Background worker - same deps as server
k8s_resource(
    'worker-deployment',
    resource_deps=['mongo', 'postgres', 'rabbitmq', 'db-migrate'],
    labels=['app'],
)

# RabbitMQ consumer - needs DBs and RabbitMQ
k8s_resource(
    'consumer-deployment',
    resource_deps=['mongo', 'postgres', 'rabbitmq', 'db-migrate'],
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

# ============================================================================
# UI Configuration
# ============================================================================

# Group resources in the Tilt UI
config.define_string_list('to-run', args=True)
cfg = config.parse()

# Update Tilt UI settings
update_settings(
    max_parallel_updates=4,
    k8s_upsert_timeout_secs=120,
)
