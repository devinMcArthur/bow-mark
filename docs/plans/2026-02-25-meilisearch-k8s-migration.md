# MeiliSearch K8s Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move MeiliSearch from a standalone DigitalOcean droplet (v1.2.0) into the production Kubernetes cluster, restoring cross-index relevance search ranking.

**Architecture:** A StatefulSet with a 5Gi DigitalOcean block storage PVC mirrors the existing `postgres-statefulset.yaml` pattern. The `search` secret `host` key is updated to the in-cluster service URL. A one-off re-index script repopulates all MeiliSearch indices from MongoDB after cutover.

**Tech Stack:** Kubernetes StatefulSet, DigitalOcean block storage (`do-block-storage`), MeiliSearch, TypeScript, `kubectl`

---

### Task 1: Create `k8s/meilisearch-statefulset.yaml`

**Files:**
- Create: `k8s/meilisearch-statefulset.yaml`

Reference: `k8s/postgres-statefulset.yaml` — follow the exact same StatefulSet + headless Service pattern.

**Step 1: Create the file**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: meilisearch
spec:
  serviceName: meilisearch
  replicas: 1
  selector:
    matchLabels:
      app: meilisearch
  template:
    metadata:
      labels:
        app: meilisearch
    spec:
      nodeSelector:
        doks.digitalocean.com/node-pool: default-pool
      containers:
        - name: meilisearch
          image: getmeili/meilisearch:v1.12.0
          ports:
            - containerPort: 7700
          env:
            - name: MEILI_MASTER_KEY
              valueFrom:
                secretKeyRef:
                  name: search
                  key: apiKey
            - name: MEILI_ENV
              value: production
          volumeMounts:
            - name: meili-data
              mountPath: /meili_data
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 7700
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 7700
            initialDelaySeconds: 30
            periodSeconds: 30
            failureThreshold: 5
  volumeClaimTemplates:
    - metadata:
        name: meili-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: do-block-storage
        resources:
          requests:
            storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: meilisearch
spec:
  clusterIP: None
  selector:
    app: meilisearch
  ports:
    - port: 7700
      targetPort: 7700
```

**Note on image tag:** `v1.12.0` is used above — verify the latest stable v1.x tag at https://hub.docker.com/r/getmeili/meilisearch/tags before applying. Any tag v1.3.0+ works.

**Step 2: Verify the file looks correct**

```bash
cat k8s/meilisearch-statefulset.yaml
```

**Step 3: Commit**

```bash
git add k8s/meilisearch-statefulset.yaml
git commit -m "feat: add MeiliSearch StatefulSet for production k8s"
```

---

### Task 2: Create `server/src/scripts/reindex-search.ts`

**Files:**
- Create: `server/src/scripts/reindex-search.ts`

Reference: `server/src/scripts/backfill-postgres.ts` — same preamble/connection pattern.
The `saveAll` function is in `server/src/testing/saveAll.ts` — it iterates all MongoDB collections and pushes each document to MeiliSearch via the `search_Update*` helpers.

**Step 1: Create the script**

```typescript
/**
 * Re-index all documents in MeiliSearch from MongoDB.
 *
 * Run this after pointing the server at a fresh MeiliSearch instance.
 *
 * Usage:
 *   node dist/scripts/reindex-search.js
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });

import mongoose from "mongoose";
import saveAll from "../testing/saveAll";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("MongoDB connected");

  console.log("\nStarting MeiliSearch re-index...");
  await saveAll();

  console.log("\nRe-index complete. Disconnecting...");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no output (clean compile).

**Step 3: Commit**

```bash
git add server/src/scripts/reindex-search.ts
git commit -m "feat: add reindex-search script for MeiliSearch repopulation"
```

---

### Task 3: Deploy and migrate

This task is all `kubectl` commands — no code changes.

**Step 1: Apply the StatefulSet**

```bash
kubectl apply -f k8s/meilisearch-statefulset.yaml
```

**Step 2: Wait for the pod to be ready**

```bash
kubectl rollout status statefulset/meilisearch
```

Expected: `statefulset rolling update complete 1 pods at revision meilisearch-...`

**Step 3: Confirm MeiliSearch is healthy**

```bash
kubectl exec meilisearch-0 -- curl -s http://localhost:7700/health
```

Expected: `{"status":"available"}`

**Step 4: Update the `search` secret to point at in-cluster service**

```bash
kubectl patch secret search --type='json' \
  -p='[{"op":"replace","path":"/data/host","value":"'"$(echo -n 'http://meilisearch:7700' | base64 -w 0)"'"}]'
```

Verify the update took:

```bash
kubectl get secret search -o jsonpath='{.data.host}' | base64 -d
```

Expected: `http://meilisearch:7700`

**Step 5: Restart server pods to pick up the new secret**

```bash
kubectl rollout restart deployment/server-deployment
kubectl rollout restart deployment/server-concrete-deployment
```

Wait for rollout:

```bash
kubectl rollout status deployment/server-deployment
kubectl rollout status deployment/server-concrete-deployment
```

**Step 6: Run the re-index as a one-off pod**

```bash
kubectl run reindex-search \
  --image=$(kubectl get deployment server-deployment -o jsonpath='{.spec.template.spec.containers[0].image}') \
  --restart=Never \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "reindex-search",
        "image": "'"$(kubectl get deployment server-deployment -o jsonpath='{.spec.template.spec.containers[0].image}')"'",
        "command": ["node", "dist/scripts/reindex-search.js"],
        "env": [
          {"name": "NODE_ENV", "value": "production"},
          {"name": "MONGO_URI", "valueFrom": {"secretKeyRef": {"name": "paving", "key": "mongoURI"}}},
          {"name": "SEARCH_HOST", "valueFrom": {"secretKeyRef": {"name": "search", "key": "host"}}},
          {"name": "SEARCH_API_KEY", "valueFrom": {"secretKeyRef": {"name": "search", "key": "apiKey"}}}
        ]
      }],
      "restartPolicy": "Never"
    }
  }'
```

**Step 7: Follow re-index logs**

```bash
kubectl logs -f reindex-search
```

Expected output: lines like `Saving N employee documents`, ..., `Finished saving`, `Re-index complete.`

**Step 8: Verify search works**

Open the production app and search for something — confirm results appear and cross-index ranking is correct (a highly relevant jobsite should appear above loosely matching companies).

**Step 9: Clean up the re-index pod**

```bash
kubectl delete pod reindex-search
```

**Step 10: Commit the migration (no code left to commit — push what's on the branch)**

```bash
git push
```

---

### Task 4: Decommission the DigitalOcean droplet

Once search is confirmed working:

1. Log into DigitalOcean → Droplets
2. Find the MeiliSearch droplet (`142.93.153.29`)
3. Destroy it

No code changes needed — the old IP is no longer referenced anywhere once the secret was updated in Task 3.
