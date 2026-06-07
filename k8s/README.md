# Kubernetes Deployment

Manifests to run the Hospital Management System on Kubernetes — locally
(minikube / kind / Docker Desktop) or on **AWS EKS**.

## What's in here

| File | Purpose |
|------|---------|
| `00-namespace.yaml` | `hospital` namespace |
| `01-config.yaml` | `ConfigMap` (DB URL, Kafka, service URLs) + `Secret` (DB credentials) |
| `02-mysql.yaml` | MySQL 8.4 — PVC + Deployment + headless Service |
| `03-kafka.yaml` | Kafka 3.7 (KRaft) — PVC + Deployment + headless Service |
| `10-13-*.yaml` | The four Spring Boot services (Deployment + ClusterIP Service each) |
| `20-ingress.yaml` | One ALB/NGINX ingress that path-routes to all four services |

Service hostnames inside the manifests (`mysql`, `kafka`, `patient-service`,
`doctor-service`) match the Kubernetes **Service names**, so Kubernetes DNS resolves
inter-service calls (Feign + Kafka + JDBC) exactly like Docker Compose did — **no code
changes**.

The apply order is encoded in the filename prefixes; `kubectl apply -f k8s/` applies them
alphabetically.

---

## A. Local cluster (minikube)

```bash
# 1. Start a cluster and enable the ingress addon
minikube start --cpus=4 --memory=6g
minikube addons enable ingress           # installs the NGINX ingress controller

# 2. Build the images straight into minikube's Docker daemon (no registry needed)
eval $(minikube docker-env)
docker compose build                     # builds patient-service:latest, etc.

# 3. The manifests default to the ALB ingress class — switch it to nginx for local
sed -i '' 's/ingressClassName: alb/ingressClassName: nginx/' k8s/20-ingress.yaml

# 4. Deploy everything
kubectl apply -f k8s/

# 5. Watch it come up (MySQL/Kafka first, then the apps)
kubectl get pods -n hospital -w
```

> `docker compose build` tags images as `patient-service:latest` etc. The Deployments
> use `imagePullPolicy: IfNotPresent`, so those local images are used directly.
> With **kind** instead of minikube, load them with
> `kind load docker-image patient-service:latest` (repeat per service).

### Test it

```bash
# Quick check via port-forward (no ingress needed)
kubectl port-forward -n hospital svc/patient-service 8081:8081 &
curl localhost:8081/patients

# Or through the ingress
curl "http://$(minikube ip)/patients"
```

---

## B. AWS EKS

### 1. Create the cluster

```bash
eksctl create cluster \
  --name hospital-cluster \
  --region ap-south-1 \
  --nodes 2 --node-type t3.medium \
  --managed
```

### 2. Add-ons the manifests depend on

```bash
# EBS CSI driver — satisfies the MySQL/Kafka PVCs with gp3 EBS volumes
eksctl create addon --name aws-ebs-csi-driver --cluster hospital-cluster --force

# AWS Load Balancer Controller — turns 20-ingress.yaml into a real ALB
# (see https://kubernetes-sigs.github.io/aws-load-balancer-controller/ for the IAM/IRSA setup)
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system --set clusterName=hospital-cluster
```

### 3. Push the images to ECR

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-south-1
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REGISTRY

for s in patient-service doctor-service appointment-service billing-service; do
  aws ecr create-repository --repository-name $s --region $REGION 2>/dev/null || true
  docker tag $s:latest $REGISTRY/$s:latest
  docker push $REGISTRY/$s:latest
done
```

### 4. Point the manifests at ECR and deploy

```bash
# Rewrite the four image refs to the ECR registry
for s in patient-service doctor-service appointment-service billing-service; do
  sed -i '' "s| image: $s:latest| image: $REGISTRY/$s:latest|" k8s/1*-$s.yaml
done

kubectl apply -f k8s/
kubectl get pods -n hospital -w
```

### 5. Reach the app

```bash
# The ALB hostname appears here once provisioned (~2-3 min)
kubectl get ingress -n hospital
curl "http://<ALB-DNS-NAME>/patients"
```

---

## Operations cheatsheet

```bash
kubectl get all -n hospital                       # everything at a glance
kubectl logs -n hospital deploy/doctor-service -f # tail a service
kubectl rollout restart deploy/appointment-service -n hospital
kubectl scale deploy/patient-service --replicas=3 -n hospital
kubectl delete -f k8s/                            # tear down
```

## Notes & trade-offs

- **MySQL & Kafka run as single-replica Deployments with PVCs.** Fine for an assignment
  demo. For production each should be a `StatefulSet` (or a managed service: **Amazon RDS**
  for MySQL, **Amazon MSK** for Kafka) — swap the `SPRING_DATASOURCE_URL` /
  `SPRING_KAFKA_BOOTSTRAP_SERVERS` values in `01-config.yaml` to point at them and delete
  `02-mysql.yaml` / `03-kafka.yaml`.
- **Secrets** are inline demo credentials. In production, pull them from **AWS Secrets
  Manager** via the Secrets Store CSI driver.
- **Probes:** `doctor-service` has Spring Boot Actuator so it uses an HTTP `/actuator/health`
  probe; the other services use TCP-socket probes (they don't expose actuator).
