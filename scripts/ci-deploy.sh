#! /bin/bash
set -e pipefail

COMMIT_SHA1=$CIRCLE_SHA1

# We must export it so it's available for envsubst
export COMMIT_SHA1=$COMMIT_SHA1

# since the only way for envsubst to work on files is using input/output redirection,
#  it's not possible to do in-place substitution, so we need to save the output to another file
#  and overwrite the original with that one.

# Only substitute $COMMIT_SHA1 — leave all other ${VAR} patterns (e.g. ${POSTGRES_USER}
# in init container commands) intact for runtime shell expansion.

# api servers
envsubst '$COMMIT_SHA1' <./k8s/server-deployment.yaml >./k8s/server-deployment.yaml.out
mv ./k8s/server-deployment.yaml.out ./k8s/server-deployment.yaml

envsubst '$COMMIT_SHA1' <./k8s/server-concrete-deployment.yaml >./k8s/server-concrete-deployment.yaml.out
mv ./k8s/server-concrete-deployment.yaml.out ./k8s/server-concrete-deployment.yaml

# workers
envsubst '$COMMIT_SHA1' <./k8s/worker-deployment.yaml >./k8s/worker-deployment.yaml.out
mv ./k8s/worker-deployment.yaml.out ./k8s/worker-deployment.yaml

envsubst '$COMMIT_SHA1' <./k8s/worker-concrete-deployment.yaml >./k8s/worker-concrete-deployment.yaml.out
mv ./k8s/worker-concrete-deployment.yaml.out ./k8s/worker-concrete-deployment.yaml

# consumers
envsubst '$COMMIT_SHA1' <./k8s/consumer-deployment.yaml >./k8s/consumer-deployment.yaml.out
mv ./k8s/consumer-deployment.yaml.out ./k8s/consumer-deployment.yaml

envsubst '$COMMIT_SHA1' <./k8s/consumer-concrete-deployment.yaml >./k8s/consumer-concrete-deployment.yaml.out
mv ./k8s/consumer-concrete-deployment.yaml.out ./k8s/consumer-concrete-deployment.yaml

envsubst '$COMMIT_SHA1' <./k8s/client-deployment.yaml >./k8s/client-deployment.yaml.out
mv ./k8s/client-deployment.yaml.out ./k8s/client-deployment.yaml

envsubst '$COMMIT_SHA1' <./k8s/client-concrete-deployment.yaml >./k8s/client-concrete-deployment.yaml.out
mv ./k8s/client-concrete-deployment.yaml.out ./k8s/client-concrete-deployment.yaml

# Auth to DO and mint a short-lived kubeconfig
./doctl auth init -t "$DO_API_TOKEN"
./doctl kubernetes cluster kubeconfig save --expiry-seconds 600 "$DO_CLUSTER"

# sanity check
./kubectl get ns

# Create/update migrations ConfigMap from SQL files
./kubectl create configmap pg-migrations \
  --from-file=./db/migrations/ \
  --dry-run=client -o yaml | ./kubectl apply -f -

# apply
./kubectl apply -f ./k8s/
