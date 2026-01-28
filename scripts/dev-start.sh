#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMP_DIR="$PROJECT_ROOT/dev-data/mongodb-dump"

echo -e "${GREEN}=== Branchable MongoDB Dev Environment ===${NC}"
echo "Project root: $PROJECT_ROOT"

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo -e "${YELLOW}Starting minikube...${NC}"
    minikube start
fi

echo -e "${GREEN}Starting skaffold...${NC}"
echo ""

# Start skaffold in the background temporarily to get MongoDB running
cd "$PROJECT_ROOT"

# Check if there's a dump to restore
if [ -d "$DUMP_DIR" ] && [ "$(ls -A $DUMP_DIR 2>/dev/null)" ]; then
    echo -e "${BLUE}Found MongoDB dump - will restore after pods are ready${NC}"
    SHOULD_RESTORE=true
else
    echo -e "${YELLOW}No MongoDB dump found at $DUMP_DIR${NC}"
    echo "Run ./scripts/seed-from-atlas.sh to pull data from Atlas"
    SHOULD_RESTORE=false
fi

echo ""

# Function to restore DB once MongoDB is ready
restore_when_ready() {
    echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
    
    # Wait for mongo pod to be running
    for i in {1..60}; do
        if kubectl get pods -l app=mongo 2>/dev/null | grep -q "Running"; then
            # Additional wait for MongoDB to actually be accepting connections
            sleep 5
            POD=$(kubectl get pods -l app=mongo -o jsonpath='{.items[0].metadata.name}')
            if kubectl exec "$POD" -- mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
                echo -e "${GREEN}MongoDB is ready!${NC}"
                
                if [ "$SHOULD_RESTORE" = true ]; then
                    echo -e "${GREEN}Restoring database from dump...${NC}"
                    
                    # Copy dump to pod
                    kubectl cp "$DUMP_DIR" "$POD:/tmp/mongodb-dump"
                    
                    # Restore
                    kubectl exec "$POD" -- mongorestore --drop /tmp/mongodb-dump
                    
                    # Cleanup
                    kubectl exec "$POD" -- rm -rf /tmp/mongodb-dump
                    
                    echo -e "${GREEN}✓ Database restored successfully${NC}"
                fi
                return 0
            fi
        fi
        echo -n "."
        sleep 2
    done
    
    echo -e "${RED}Timeout waiting for MongoDB${NC}"
    return 1
}

# Run restore in background
restore_when_ready &
RESTORE_PID=$!

# Handle cleanup
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $RESTORE_PID 2>/dev/null || true
}
trap cleanup EXIT

# Run skaffold (this blocks until Ctrl+C)
skaffold dev
