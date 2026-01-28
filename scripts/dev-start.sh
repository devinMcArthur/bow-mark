#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONGO_DATA_DIR="$PROJECT_ROOT/dev-data/mongodb"
MOUNT_PATH="/mongo-dev-data"

echo -e "${GREEN}=== Branchable MongoDB Dev Environment ===${NC}"
echo "Project root: $PROJECT_ROOT"
echo "MongoDB data: $MONGO_DATA_DIR"

# Ensure the data directory exists
mkdir -p "$MONGO_DATA_DIR"

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo -e "${YELLOW}Starting minikube...${NC}"
    minikube start
fi

# Check if mount is already active
MOUNT_PID_FILE="/tmp/minikube-mongo-mount.pid"

cleanup_mount() {
    if [ -f "$MOUNT_PID_FILE" ]; then
        OLD_PID=$(cat "$MOUNT_PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping existing mount (PID: $OLD_PID)...${NC}"
            kill "$OLD_PID" 2>/dev/null || true
            sleep 1
        fi
        rm -f "$MOUNT_PID_FILE"
    fi
}

# Check if mount point exists and is accessible in minikube
mount_exists() {
    minikube ssh "mount | grep -q '$MOUNT_PATH'" 2>/dev/null
}

# Start the mount
start_mount() {
    cleanup_mount
    
    echo -e "${GREEN}Starting minikube mount: $MONGO_DATA_DIR -> $MOUNT_PATH${NC}"
    
    # Create mount point in minikube
    minikube ssh "sudo mkdir -p $MOUNT_PATH && sudo chmod 777 $MOUNT_PATH"
    
    # Start mount in background
    nohup minikube mount "$MONGO_DATA_DIR:$MOUNT_PATH" \
        --uid 999 --gid 999 \
        > /tmp/minikube-mount.log 2>&1 &
    
    MOUNT_PID=$!
    echo $MOUNT_PID > "$MOUNT_PID_FILE"
    
    # Wait for mount to be ready
    echo -n "Waiting for mount to be ready"
    for i in {1..30}; do
        if mount_exists; then
            echo -e "\n${GREEN}Mount ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    echo -e "\n${RED}Mount failed to start. Check /tmp/minikube-mount.log${NC}"
    return 1
}

# Always restart mount to ensure it's fresh
start_mount

# Handle cleanup on script exit
trap 'echo -e "\n${YELLOW}Shutting down...${NC}"' EXIT

echo -e "${GREEN}Starting skaffold...${NC}"
echo ""

# Run skaffold (this blocks until Ctrl+C)
cd "$PROJECT_ROOT"
skaffold dev

# After skaffold exits, the trap will run
