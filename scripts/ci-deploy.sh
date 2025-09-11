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

./kubectl \
  --kubeconfig=/dev/null \
  --server=$KUBERNETES_SERVER \
  --certificate-authority=cert.crt \
  --token=$KUBERNETES_TOKEN \
  --validate=false \
  apply -f ./k8s/
