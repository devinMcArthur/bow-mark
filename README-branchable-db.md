# Branchable MongoDB Development Environment

This setup allows you to have branch-specific database states that travel with your code.

## Quick Start

```bash
# Start development environment (handles everything)
./scripts/dev-start.sh

# Stop development environment
./scripts/dev-stop.sh
# Or just Ctrl+C in the terminal running dev-start.sh
```

## First-Time Setup

### 1. Seed from Atlas (one-time)

Pull your current development data from Atlas:

```bash
# Set your Atlas connection string
export ATLAS_URI='mongodb+srv://user:pass@cluster.mongodb.net/dbname'

# Or add to .env file
echo "ATLAS_URI='mongodb+srv://...'" >> .env

# Run the seed script
./scripts/seed-from-atlas.sh
```

### 2. Install Git Hooks (optional but recommended)

```bash
cp scripts/git-hooks/post-checkout .git/hooks/
chmod +x .git/hooks/post-checkout
```

This will remind you to restore the database when switching branches.

## Daily Workflow

### Starting Development

```bash
./scripts/dev-start.sh
```

This script:
1. Ensures minikube is running
2. Sets up the host→minikube volume mount
3. Starts skaffold with all services
4. Port-forwards MongoDB to localhost:27017 (for Compass, etc.)

### Saving Database State

Before committing changes that include schema or data changes:

```bash
./scripts/save-db-state.sh
git add dev-data/mongodb-dump/
git commit -m "feat: new feature with updated schema"
```

### Switching Branches

```bash
# Stop current environment
./scripts/dev-stop.sh

# Switch branches  
git checkout feature/other-feature

# Start environment (will use the new branch's data directory)
./scripts/dev-start.sh

# If the branch has a committed dump, restore it
./scripts/restore-dump.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your Repository                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  dev-data/                                               │
│    ├── mongodb/          ← Live data (gitignored)       │
│    │   └── [WiredTiger files...]                        │
│    │                                                     │
│    └── mongodb-dump/     ← Committed snapshots          │
│        └── your_db/                                      │
│            ├── collection1.bson                          │
│            └── collection1.metadata.json                 │
│                                                          │
│  scripts/                                                │
│    ├── dev-start.sh      ← Start everything             │
│    ├── dev-stop.sh       ← Stop everything              │
│    ├── save-db-state.sh  ← Dump for committing          │
│    ├── restore-dump.sh   ← Restore from dump            │
│    └── seed-from-atlas.sh ← Initial seed from Atlas     │
│                                                          │
└─────────────────────────────────────────────────────────┘
            │
            │ minikube mount
            ▼
┌─────────────────────────────────────────────────────────┐
│  Minikube VM                                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /mongo-dev-data  ←──── hostPath PV ────→  MongoDB Pod  │
│                                             /data/db     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## What Gets Committed

| Path | Committed? | Purpose |
|------|-----------|---------|
| `dev-data/mongodb/` | ❌ No | Live MongoDB data files (binary, locked) |
| `dev-data/mongodb-dump/` | ✅ Yes | Portable BSON snapshots |

## Accessing MongoDB

When the dev environment is running:

- **From your app in k8s**: `mongodb://mongo:27017`
- **From your host machine**: `mongodb://localhost:27017` (port-forwarded)
- **MongoDB Compass**: Connect to `localhost:27017`

## Troubleshooting

### Mount fails to start

```bash
# Check mount logs
cat /tmp/minikube-mount.log

# Manually verify mount
minikube ssh "ls -la /mongo-dev-data"
```

### MongoDB won't start

```bash
# Check pod status
kubectl describe pod -l app=mongo

# Check logs
kubectl logs -l app=mongo
```

### Data corruption after hard stop

If you force-killed the environment, MongoDB's data files might be corrupted:

```bash
# Remove corrupted data
rm -rf dev-data/mongodb/*

# Restore from last good dump
./scripts/restore-dump.sh
```

## Tips

1. **Commit dumps before major changes** - If a migration goes wrong, you can restore
2. **Keep dumps small** - For large datasets, consider using a subset for development
3. **Use .gitattributes for BSON** - Mark as binary to avoid merge conflicts:
   ```
   *.bson binary
   ```
