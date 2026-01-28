#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MOUNT_PID_FILE="/tmp/minikube-mongo-mount.pid"

echo -e "${YELLOW}=== Stopping Dev Environment ===${NC}"

# Stop skaffold if running (it usually handles its own cleanup)
if pgrep -f "skaffold dev" > /dev/null; then
    echo "Stopping skaffold..."
    pkill -f "skaffold dev" || true
fi

# Stop the mount
if [ -f "$MOUNT_PID_FILE" ]; then
    PID=$(cat "$MOUNT_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Stopping minikube mount (PID: $PID)..."
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$MOUNT_PID_FILE"
fi

echo -e "${GREEN}Dev environment stopped.${NC}"
echo ""
echo "Your MongoDB data is preserved in ./dev-data/mongodb/"
echo "It will be restored when you run ./scripts/dev-start.sh again."
