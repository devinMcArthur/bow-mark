#!/bin/bash
set -e

# Generate Kysely types from the PostgreSQL database schema
# 
# Prerequisites:
#   npm install -D kysely-codegen
#   Database must be running with migrations applied
#
# Usage:
#   ./scripts/generate-db-types.sh
#   # or with custom connection
#   DATABASE_URL="postgres://user:pass@host:5432/db" ./scripts/generate-db-types.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default to local dev database
DATABASE_URL="${DATABASE_URL:-postgres://bowmark:devpassword@localhost:5432/bowmark_reports_paving}"

echo "Generating Kysely types from database..."
echo "Database: ${DATABASE_URL%%@*}@****"

npx kysely-codegen \
  --dialect postgres \
  --url "$DATABASE_URL" \
  --out-file "$PROJECT_ROOT/server/src/db/generated-types.ts"

echo "✓ Types generated at server/src/db/generated-types.ts"
