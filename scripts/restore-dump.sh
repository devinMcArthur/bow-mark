#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMP_DIR="$PROJECT_ROOT/dev-data/mongodb-dump"

echo -e "${GREEN}=== Restoring MongoDB Dump ===${NC}"

# Check if dump exists
if [ ! -d "$DUMP_DIR" ]; then
    echo -e "${RED}Error: No dump found at $DUMP_DIR${NC}"
    echo "Run ./scripts/seed-from-atlas.sh first to create a dump"
    exit 1
fi

# Check if MongoDB is running
if ! kubectl get pods -l app=mongo 2>/dev/null | grep -q Running; then
    echo -e "${RED}Error: MongoDB is not running${NC}"
    echo "Start your dev environment first: ./scripts/dev-start.sh"
    exit 1
fi

POD=$(kubectl get pods -l app=mongo -o jsonpath='{.items[0].metadata.name}')

echo "Restoring dump to pod: $POD"
echo -e "${YELLOW}Warning: This will drop existing collections!${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo -e "${GREEN}Copying dump to pod...${NC}"
kubectl cp "$DUMP_DIR" "$POD:/tmp/mongodb-dump"

echo -e "${GREEN}Running mongorestore...${NC}"
kubectl exec "$POD" -- mongorestore --drop /tmp/mongodb-dump

echo -e "${GREEN}Cleaning up...${NC}"
kubectl exec "$POD" -- rm -rf /tmp/mongodb-dump

echo -e "${GREEN}Restore complete!${NC}"
