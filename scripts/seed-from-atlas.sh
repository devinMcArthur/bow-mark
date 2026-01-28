#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONGO_DATA_DIR="$PROJECT_ROOT/dev-data/mongodb"
DUMP_DIR="$PROJECT_ROOT/dev-data/mongodb-dump"

# Check for Atlas connection string
if [ -z "$ATLAS_URI" ]; then
    echo -e "${YELLOW}ATLAS_URI not set. Checking .env file...${NC}"
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep ATLAS_URI "$PROJECT_ROOT/.env" | xargs)
    fi
    if [ -z "$ATLAS_URI" ]; then
        echo -e "${RED}Error: ATLAS_URI environment variable not set${NC}"
        echo "Usage: ATLAS_URI='mongodb+srv://...' ./scripts/seed-from-atlas.sh"
        echo "Or add ATLAS_URI to your .env file"
        exit 1
    fi
fi

echo -e "${GREEN}=== Seeding Local MongoDB from Atlas ===${NC}"

# Create dump directory
mkdir -p "$DUMP_DIR"

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo -e "${YELLOW}mongodump not found. Installing MongoDB tools...${NC}"
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install mongodb-database-tools
    else
        echo -e "${RED}Please install mongodb-database-tools manually${NC}"
        echo "See: https://www.mongodb.com/docs/database-tools/installation/"
        exit 1
    fi
fi

# Dump from Atlas
echo -e "${GREEN}Dumping from Atlas...${NC}"
mongodump --uri="$ATLAS_URI" --out="$DUMP_DIR"

echo -e "${GREEN}Dump complete!${NC}"
echo "Dump location: $DUMP_DIR"
echo ""

# Check if local MongoDB is running
if kubectl get pods -l app=mongo 2>/dev/null | grep -q Running; then
    echo -e "${YELLOW}Local MongoDB is running.${NC}"
    read -p "Do you want to restore the dump to local MongoDB now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Restoring to local MongoDB...${NC}"
        
        # Get the pod name
        POD=$(kubectl get pods -l app=mongo -o jsonpath='{.items[0].metadata.name}')
        
        # Copy dump to pod and restore
        kubectl cp "$DUMP_DIR" "$POD:/tmp/mongodb-dump"
        kubectl exec "$POD" -- mongorestore --drop /tmp/mongodb-dump
        kubectl exec "$POD" -- rm -rf /tmp/mongodb-dump
        
        echo -e "${GREEN}Restore complete!${NC}"
    fi
else
    echo ""
    echo "To restore this dump to your local MongoDB:"
    echo "1. Start your dev environment: ./scripts/dev-start.sh"
    echo "2. Run: ./scripts/restore-dump.sh"
fi
