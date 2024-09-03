# General Setup

Before deploying or running skaffold, be sure to replace all instances of `itsdevin/*`
Docker Hub references with your own Docker Hub images.

# Development

## Docker Compose

- `docker-compose up`

## Skaffold

- `skaffold dev`
  - NOTE - if you have this error: `updates to statefulset spec for fields other than 'replicas', 'template', and 'updateStrategy' are forbidden`
  - run the command again - haven't found a better fix for this
  - Meilisearch volume is stored at `/tml/data/meilisearch` in the minikube VM
    - To remove this data:
      - SSH into the VM `minikube ssh`
      - Delete the data `rm -rf /tml/data/meilisearch`

# Production

## Kubernetes Setup

- Domain / Load-balancer Resource: https://www.digitalocean.com/community/tutorials/how-to-set-up-an-nginx-ingress-with-cert-manager-on-digitalocean-kubernetes

- Create a k8s cluster on your preferred hosting platform (at least 2vCPU, 4GB Memory, 100Gb Disk)

- Add load balancer `kubectl apply -f ./k8s-misc/load-balancer.yaml`

- Once created, get external IP address of 'ingress-nginx-controller' using `kubectl get svc -n ingress-nginx`

- Install cert manager `kubectl apply --validate=false -f ./k8s-misc/cert-manager.yaml`

- Put the email address associated with your domain in ./k8s-misc/prod-issuer.yaml

- Create production issuer `kubectl create -f ./k8s-misc/prod-issuer.yaml`

- If using Digital Ocean

  - Create an A record for workaround.<your-domain> in your DNS management service, using the external IP from 'ingress-nginx-controller'

  - Edit the 'do-loadbalancer-hostname' variable in `ingress-nginx-svc.yaml` file with the domain you've just created (workaround.<your-domain>)

  - `kubectl apply -f ./k8s-misc/ingress-nginx-svc.yaml`

- Place your domains in the `./k8s/ingress-service.yaml` file

- `kubectl apply -f ./k8s/ingress-service.yaml`

- Check certificate `kubectl describe certificate <name>-tls`

- Create secrets:

  - `kubectl create secret generic meilisearch --from-literal=masterKey="<your-key>"`

- Required secrets / environment variables:

  - `NODE_ENV`: Always `production` in the production environment
  - `NAME`: A unique name for this particular app (i.e., "paving_server", "concrete_server")
  - `APP_NAME`: A human readable name for this app
  - `APP_TYPE`: Environment variable that determines behaviour of server ("api" | "worker")
  - `EMAIL`: Email that will be used as a sender address
  - `EMAIL_HOST`: Host server for the email service
  - `EMAIL_PASSWORD`: Password for server authentication
  - `EMAIL_PORT`: Port for email server
  - `EMAIL_USERNAME`: Username used for email service authentication
  - `JWT_SECRET`: String used for encoding Bearer JWT tokens for API authentication
  - `MONGO_URI`: Mongo DB connection URL
  - `SPACES_NAME`: The name of the DigitalOcean Space
  - `SPACES_KEY`: Secret key for connecting to DigitalOcean Space
  - `SPACES_REGION`: Region of DigitalOcean Space
  - `SPACES_SECRET`: Secret used for authentication to DO Space
  - `SEARCH_GROUP`: A unique name used for indexing items for this app in search (relevant if sharing a search environment with another application)
  - `SEARCH_HOST`: Search server (currently using Meilisearch)
  - `SEARCH_API_KEY`: Your own unique key used as a password for your search instance

## App Deployment

- Create CircleCI project and add necessary environment variables (DOCKERHUB_PASS, DOCKERHUB_USERNAME, KUBERNETES_CLUSTER_CERTIFICATE, KUBERNETES_SERVER, KUBERNETES_TOKEN)

- Ensure .circleci/config.yaml has the correct Image Names for SERVER_IMAGE_NAME and CLIENT_IMAGE_NAME

- Create required secrets

  - `kubectl create secret generic server-secrets --from-literal=mongoURI=<value> --from-literal=jwtSecret=<value> --from-literal=elasticsearchPassword=<value>`

- Deploy to your branch and ensure CircleCI passes

# Kubernetes Resources

Min Resources:
 - CPU: 3000m
 - Memory: 6000Mi

Max Resources:
 - CPU: 6000m
 - Memory: 12000Mi

server-deployment: 2
```
requests:
  cpu: "500m"
  memory: "1000Mi"
limits:
  cpu: "900m"
  memory: "1500Mi"
```

server-concrete-deployment: 2
```
requests:
  cpu: "500m"
  memory: "1000Mi"
limits:
  cpu: "900m"
  memory: "1500Mi"
```

client-deployment: 1
```
requests:
  cpu: "250m"
  memory: "500Mi"
limits:
  cpu: "1000m"
  memory: "2000Mi"
```

client-concrete-deployment: 1
```
requests:
  cpu: "250m"
  memory: "500Mi"
limits:
  cpu: "1000m"
  memory: "2000Mi"
```

worker-deployment: 1
```
requests:
  cpu: "250m"
  memory: "500Mi"
limits:
  cpu: "1000m"
  memory: "2000Mi"
```

worker-concrete-deployment: 1
```
requests:
  cpu: "250m"
  memory: "500Mi"
limits:
  cpu: "1000m"
  memory: "2000Mi"
```
