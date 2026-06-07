#!/usr/bin/env bash
#
# One-shot AWS EKS deployment for the Hospital Management System.
#   - Pushes the locally-built images to ECR
#   - Creates an EKS cluster (2x t3.medium)
#   - Installs the EBS CSI driver (for the MySQL/Kafka PVCs)
#   - Deploys all backend services + MySQL + Kafka
#
# 💰 COST: the EKS control plane ($0.10/hr) + 2 t3.medium nodes start billing
#    once the cluster exists. Run ./aws-teardown.sh as soon as you're done.
#
# Prereqs: aws (configured), eksctl, kubectl, docker, and the images already built
#          (`docker compose build`).
set -euo pipefail

CLUSTER=hospital-cluster
REGION=$(aws configure get region)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
SERVICES="patient-service doctor-service appointment-service billing-service"

echo ">> Account: $ACCOUNT   Region: $REGION"
echo ">> Registry: $REGISTRY"

# ---------------------------------------------------------------------------
echo ">> [1/4] Pushing images to ECR..."
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"
for s in $SERVICES; do
  aws ecr describe-repositories --repository-names "$s" --region "$REGION" >/dev/null 2>&1 \
    || aws ecr create-repository --repository-name "$s" --region "$REGION" >/dev/null
  docker tag "hospital-management-system-$s:latest" "$REGISTRY/$s:latest"
  docker push "$REGISTRY/$s:latest"
done

# ---------------------------------------------------------------------------
echo ">> [2/4] Creating EKS cluster (this takes ~15-20 minutes)..."
if ! eksctl get cluster --name "$CLUSTER" --region "$REGION" >/dev/null 2>&1; then
  eksctl create cluster \
    --name "$CLUSTER" \
    --region "$REGION" \
    --nodes 2 --node-type t3.medium \
    --with-oidc \
    --managed
else
  echo "   cluster already exists, skipping."
fi

# ---------------------------------------------------------------------------
echo ">> [3/4] Installing EBS CSI driver (for persistent volumes)..."
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa --namespace kube-system \
  --cluster "$CLUSTER" --region "$REGION" \
  --role-name "AmazonEKS_EBS_CSI_DriverRole_${CLUSTER}" \
  --role-only \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve
eksctl create addon \
  --name aws-ebs-csi-driver --cluster "$CLUSTER" --region "$REGION" \
  --service-account-role-arn "arn:aws:iam::${ACCOUNT}:role/AmazonEKS_EBS_CSI_DriverRole_${CLUSTER}" \
  --force

# ---------------------------------------------------------------------------
echo ">> [4/4] Deploying the app (ECR images; ingress skipped for a simple demo)..."
TMP=$(mktemp -d)
cp k8s/*.yaml "$TMP/"
rm -f "$TMP/20-ingress.yaml"          # ALB ingress needs the LB Controller; skip for demo
for s in $SERVICES; do
  sed -i.bak "s|image: ${s}:latest|image: ${REGISTRY}/${s}:latest|" "$TMP"/*"$s"*.yaml
done
kubectl apply -f "$TMP/"

echo
echo ">> Done. Watch the pods come up with:"
echo "     kubectl get pods -n hospital -w"
echo
echo ">> Once all pods are Running, test with a port-forward:"
echo "     kubectl port-forward -n hospital svc/patient-service 8081:8081"
echo "     curl localhost:8081/patients"
echo
echo ">> 🔴 REMEMBER to run ./k8s/aws-teardown.sh when finished (it bills hourly)."
