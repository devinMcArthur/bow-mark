#! /bin/bash
set -e pipefail

COMMIT_SHA1=$CIRCLE_SHA1

# We must export it so it's available for envsubst
export COMMIT_SHA1=$COMMIT_SHA1

# since the only way for envsubst to work on files is using input/output redirection,
#  it's not possible to do in-place substitution, so we need to save the output to another file
#  and overwrite the original with that one.

# api servers
envsubst <./k8s/server-deployment.yaml >./k8s/server-deployment.yaml.out
mv ./k8s/server-deployment.yaml.out ./k8s/server-deployment.yaml

envsubst <./k8s/server-concrete-deployment.yaml >./k8s/server-concrete-deployment.yaml.out
mv ./k8s/server-concrete-deployment.yaml.out ./k8s/server-concrete-deployment.yaml

# workers
envsubst <./k8s/worker-deployment.yaml >./k8s/worker-deployment.yaml.out
mv ./k8s/worker-deployment.yaml.out ./k8s/worker-deployment.yaml

envsubst <./k8s/worker-concrete-deployment.yaml >./k8s/worker-concrete-deployment.yaml.out
mv ./k8s/worker-concrete-deployment.yaml.out ./k8s/worker-concrete-deployment.yaml

envsubst <./k8s/client-deployment.yaml >./k8s/client-deployment.yaml.out
mv ./k8s/client-deployment.yaml.out ./k8s/client-deployment.yaml

envsubst <./k8s/client-concrete-deployment.yaml >./k8s/client-concrete-deployment.yaml.out
mv ./k8s/client-concrete-deployment.yaml.out ./k8s/client-concrete-deployment.yaml

# Auth to DO and mint a short-lived kubeconfig
./doctl auth init -t "$DO_API_TOKEN"
./doctl kubernetes cluster kubeconfig save --expiry-seconds 600 "$DO_CLUSTER"

# sanity check
./kubectl get ns

# apply
./kubectl apply -f ./k8s/
