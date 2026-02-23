#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMP_BASE_DIR="$PROJECT_ROOT/dev-data/postgres-dump"

echo -e "${GREEN}=== Saving PostgreSQL State ===${NC}"

# Check if PostgreSQL pod is running
if ! kubectl get pods -l app=postgres 2>/dev/null | grep -q Running; then
    echo -e "${RED}Error: PostgreSQL is not running${NC}"
    echo "Start your dev environment first: tilt up"
    exit 1
fi

PG_POD=$(kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}')

for APP_TYPE in paving concrete; do
    DB_NAME="bowmark_reports_$APP_TYPE"
    DUMP_DIR="$DUMP_BASE_DIR/$APP_TYPE"
    DUMP_FILE="$DUMP_DIR/dump.pgdump"

    # Check if database exists and has tables
    TABLE_COUNT=$(kubectl exec "$PG_POD" -- psql -U bowmark -d "$DB_NAME" -tAc \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")

    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}Saving $APP_TYPE PostgreSQL state...${NC}"
        mkdir -p "$DUMP_DIR"

        # Dump inside the pod, then copy out
        kubectl exec "$PG_POD" -- pg_dump -U bowmark -Fc "$DB_NAME" > "$DUMP_FILE"

        DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
        echo -e "  Saved to: ${GREEN}$DUMP_FILE${NC} ($DUMP_SIZE)"
    else
        echo -e "${YELLOW}Skipping $APP_TYPE - database '$DB_NAME' has no tables${NC}"
        echo "  Run backfill first, then save state"
    fi
done

echo ""
echo "To commit PostgreSQL state with your branch:"
echo "  git add dev-data/postgres-dump/"
echo "  git commit -m 'Update dev PostgreSQL state'"
