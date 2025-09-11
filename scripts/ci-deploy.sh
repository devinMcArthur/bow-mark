#! /bin/bash
# exit script when any command ran here returns with non-zero exit code
set -e

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

export COMMIT_SHA1=$COMMIT_SHA1

envsubst <./k8s/client-deployment.yaml >./k8s/client-deployment.yaml.out
mv ./k8s/client-deployment.yaml.out ./k8s/client-deployment.yaml

envsubst <./k8s/client-concrete-deployment.yaml >./k8s/client-concrete-deployment.yaml.out
mv ./k8s/client-concrete-deployment.yaml.out ./k8s/client-concrete-deployment.yaml

echo "$KUBERNETES_CLUSTER_CERTIFICATE" | base64 --decode > cert.crt

# 0) Install doctl + kubectl (or use an image that has both)
curl -sL https://github.com/digitalocean/doctl/releases/latest/download/doctl-1.114.0-linux-amd64.tar.gz \
  | tar -xz && sudo mv doctl /usr/local/bin/
# install kubectl matching your cluster (example: 1.29)
KVER=1.29.7
curl -LO https://dl.k8s.io/release/v${KVER}/bin/linux/amd64/kubectl
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# 1) Authenticate doctl (store DO_API_TOKEN in CircleCI)
doctl auth init -t "$DO_API_TOKEN"

# 2) Fetch a short-lived kubeconfig for the cluster
#    CLUSTER can be the cluster name or ID; 600s is usually enough for an apply
doctl kubernetes cluster kubeconfig save --expiry-seconds 600 "$DO_CLUSTER"

# 3) Sanity check (forces auth)
kubectl version --client --short
kubectl get ns

# 4) Apply
kubectl apply -f ./k8s/
