#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMP_DIR="$PROJECT_ROOT/dev-data/mongodb-dump"

echo -e "${GREEN}=== Saving MongoDB State ===${NC}"

# Check if MongoDB is running
if ! kubectl get pods -l app=mongo 2>/dev/null | grep -q Running; then
    echo -e "${RED}Error: MongoDB is not running${NC}"
    echo "Start your dev environment first: ./scripts/dev-start.sh"
    exit 1
fi

POD=$(kubectl get pods -l app=mongo -o jsonpath='{.items[0].metadata.name}')

# Clear old dump
rm -rf "$DUMP_DIR"
mkdir -p "$DUMP_DIR"

echo "Dumping from pod: $POD"

# Create dump inside the pod
kubectl exec "$POD" -- mongodump --out /tmp/mongodb-dump

# Copy dump from pod
kubectl cp "$POD:/tmp/mongodb-dump" "$DUMP_DIR"

# Clean up pod
kubectl exec "$POD" -- rm -rf /tmp/mongodb-dump

echo -e "${GREEN}Dump saved to: $DUMP_DIR${NC}"
echo ""
echo "To commit this database state with your branch:"
echo "  git add dev-data/mongodb-dump/"
echo "  git commit -m 'Update dev database state'"
echo ""

# Show what would be committed
echo "Files to be committed:"
find "$DUMP_DIR" -type f | head -20
COUNT=$(find "$DUMP_DIR" -type f | wc -l)
if [ "$COUNT" -gt 20 ]; then
    echo "... and $((COUNT - 20)) more files"
fi
