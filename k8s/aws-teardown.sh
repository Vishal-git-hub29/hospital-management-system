#!/usr/bin/env bash
#
# Tears down EVERYTHING created by aws-deploy.sh so AWS stops billing.
# Deletes: the app namespace, the EKS cluster (nodes + control plane + VPC),
# and the ECR repositories.
set -euo pipefail

CLUSTER=hospital-cluster
REGION=$(aws configure get region)
SERVICES="patient-service doctor-service appointment-service billing-service"

echo ">> [1/3] Deleting Kubernetes resources (releases EBS volumes / load balancers)..."
kubectl delete namespace hospital --ignore-not-found --wait=true || true

echo ">> [2/3] Deleting the EKS cluster (this takes ~10-15 minutes)..."
eksctl delete cluster --name "$CLUSTER" --region "$REGION" --wait

echo ">> [3/3] Deleting ECR repositories..."
for s in $SERVICES; do
  aws ecr delete-repository --repository-name "$s" --region "$REGION" --force >/dev/null 2>&1 || true
done

echo
echo ">> Teardown complete."
echo ">> Double-check in the AWS Console that the CloudFormation stacks"
echo "   (eksctl-hospital-cluster-*) are gone, so nothing keeps billing."
