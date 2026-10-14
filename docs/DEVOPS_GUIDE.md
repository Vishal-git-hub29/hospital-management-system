# DevOps Guide: Hospital Management System

End-to-end steps for the workflow in your PDF (Git → Maven → Node → Docker → Docker Hub →
Jenkins → Kubernetes → Monitoring), adapted to what is actually in this repo, plus GitHub Actions.

```
Fork/clone ─► Run backend ─► Run frontend ─► Dockerize ─► Docker Hub ─┬─► GitHub Actions (CI + push)
                                                                      └─► Jenkins ─► Minikube ─► Prometheus/Grafana
```

## 0. What the repo already has vs. what was missing

| PDF stage | State in the repo | What was added |
|---|---|---|
| Backend (Maven) | 5 Spring Boot services, each with `mvnw` | Prometheus metrics dependency in every `pom.xml` |
| Frontend (Node) | Vite + React in `frontend/` | `API_BASE` build arg, `.dockerignore`, `npm ci` |
| Dockerize | Dockerfiles for all 6 images, `docker-compose.yml` | nothing (already done) |
| Docker Hub | none | pushed by Jenkins and GitHub Actions |
| Jenkins | none | `Jenkinsfile` |
| GitHub Actions | none | `.github/workflows/ci.yml` |
| Kubernetes | `k8s/` had MySQL, Kafka, 4 services, ingress | `14-auth-service.yaml`, `15-frontend.yaml`, ingress `/auth` + `/`, `k8s/local/ingress-nginx.yaml` |
| Monitoring | none | `k8s/monitoring/` (Prometheus + Grafana) |

**Differences from the PDF you should know about**

- The PDF says "backend on 8080, frontend on 3000, `npm start`". In this repo there are **five**
  backends on **8081, 8083, 8084, 8085, 8086**, the frontend is **Vite** (`npm run dev` on 5173, or
  nginx on 8080 in Docker Compose). There is no `backend/` folder and no `npm start`.
- The PDF lists JDK 21. The project targets **Java 17** (`pom.xml`, Dockerfiles). JDK 21 can build it,
  but the pipelines use 17 to match.
- Jenkins defaults to port **8080**, which collides with the Compose frontend. This guide runs Jenkins on **8090**.

---

## 1. Get the changes into your fork

Unzip the delivered `hospital-devops-additions.zip` over the root of your clone (it keeps the folder
layout), then:

```powershell
git clone https://github.com/Vishal-git-hub29/hospital-management-system.git
cd hospital-management-system
# unzip the additions here, overwriting when asked
git add -A
git commit -m "Add CI/CD, Kubernetes, monitoring"
git push origin main
```

## 2. Prerequisites (PDF step 2)

Git, JDK 17 (or 21), Node 20, Docker Desktop, Minikube, kubectl, Jenkins. Maven is optional because each
service ships `mvnw`. Check:

```powershell
git --version; java -version; node -v; docker --version; minikube version; kubectl version --client
```

## 3. Run the backend locally (PDF step 4)

The services expect MySQL at host `mysql` and Kafka at `kafka`, and the Feign clients are hardcoded to
`http://patient-service:8081` / `http://doctor-service:8083`. Running them outside Docker therefore needs extra setup.

**Easiest (recommended): run everything in containers**

```powershell
docker compose up --build
```

**Single service outside Docker** (patient-service needs only MySQL):

```powershell
docker compose up -d mysql
cd patient-service
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:3306/hospital_db"
.\mvnw.cmd clean install        # builds and runs the tests
.\mvnw.cmd spring-boot:run      # http://localhost:8081/patients
```

For `doctor`, `appointment` and `billing` outside Docker, add this line to
`C:\Windows\System32\drivers\etc\hosts` (as Administrator) so the hardcoded names resolve, and start `kafka` too:

```
127.0.0.1 mysql kafka patient-service doctor-service
```

Endpoints: patient `:8081/patients`, doctor `:8083/doctors`, appointment `:8084/appointments`,
billing `:8085/bills`, auth `:8086/auth`.

## 4. Run the frontend locally (PDF step 5)

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173  (not "npm start")
```

## 5. Dockerize (PDF steps 6 and 7): already done

Each service and the frontend have a multi-stage Dockerfile. To test one by hand:

```powershell
docker build -t patient-service-test ./patient-service
docker compose up --build            # full stack; UI at http://localhost:8080
```

## 6. Push images to Docker Hub (PDF step 8)

1. Create a Docker Hub account, then **Account Settings → Personal access tokens → New token** (Read & Write).
   You will use this token instead of your password in Jenkins and GitHub.
2. Manual push (optional, the pipelines do this for you):

```powershell
docker login
$u = "YOUR_DOCKERHUB_USERNAME"
foreach ($s in "patient-service","doctor-service","appointment-service","billing-service","auth-service") {
  docker build -t "$u/${s}:v1" "./$s"; docker push "$u/${s}:v1"
}
docker build --build-arg API_BASE=http://localhost:8088 -t "$u/frontend:v1" ./frontend
docker push "$u/frontend:v1"
```

Keep the repositories **public** (free tier), or Kubernetes will need an `imagePullSecret` to pull them.

## 7. GitHub Actions

File: `.github/workflows/ci.yml`. On every push or PR to `main` it builds and tests the five services
(each against a MySQL service container) and builds the frontend. On a push to `main` it then builds and
pushes all six images to Docker Hub tagged `:latest` and `:<commit-sha>`.

Setup, in your fork under **Settings → Secrets and variables → Actions**:

| Type | Name | Value |
|---|---|---|
| Secret | `DOCKERHUB_USERNAME` | your Docker Hub username |
| Secret | `DOCKERHUB_TOKEN` | the access token from step 6 |
| Variable (optional) | `API_BASE` | frontend API URL, default `http://localhost:8088` |

Verify: push a commit, open the **Actions** tab, and confirm all jobs go green and the images appear on Docker Hub.

GitHub-hosted runners cannot reach your local Minikube, so Actions stops at "push images". Deployment is Jenkins' job.

## 8. Jenkins pipeline (PDF step "G")

Stages: **Checkout → Build & Test (5 services in parallel) → Build Frontend → Docker Build → Docker Push → Deploy**.

**One-time setup**

1. Download `jenkins.war` and run it **as your own user** (so `docker`, `kubectl` and your Minikube kubeconfig work):
   ```powershell
   java -jar jenkins.war --httpPort=8090
   ```
   Open http://localhost:8090, unlock with the printed password, install the suggested plugins.
2. **Manage Jenkins → Credentials → System → Global → Add Credentials**: kind *Username with password*,
   username = Docker Hub username, password = access token, **ID = `dockerhub-creds`**.
3. **New Item → Pipeline** → *Pipeline script from SCM* → Git → your fork URL → branch `*/main` →
   Script Path `Jenkinsfile`. Under *Build Triggers* tick **Poll SCM** with `H/5 * * * *`
   (a webhook can't reach a Jenkins running on localhost).
4. Before the first run, prepare the cluster (section 9, steps 1 and 2).

**Run it:** *Build with Parameters*. `RUN_TESTS` starts a throwaway MySQL container for the test stage;
untick it if the tests fail for environment reasons. `DEPLOY` controls the Minikube deploy.

## 9. Kubernetes on Minikube (PDF step 10)

One-time cluster preparation:

```powershell
minikube start --cpus=4 --memory=6g          # use 8g if you also run monitoring
minikube addons enable ingress
kubectl get nodes

kubectl apply -f k8s/00-namespace.yaml
kubectl -n hospital create secret generic auth-secret --from-literal=JWT_SECRET="a-long-random-string-of-32+-characters"
```

Then run the Jenkins job (it applies the manifests and sets each Deployment to the image it just pushed).

Manual equivalent without Jenkins:

```powershell
kubectl apply -f k8s/00-namespace.yaml -f k8s/01-config.yaml -f k8s/02-mysql.yaml -f k8s/03-kafka.yaml `
  -f k8s/10-patient-service.yaml -f k8s/11-doctor-service.yaml -f k8s/12-appointment-service.yaml `
  -f k8s/13-billing-service.yaml -f k8s/14-auth-service.yaml -f k8s/15-frontend.yaml -f k8s/local/ingress-nginx.yaml
foreach ($s in "patient-service","doctor-service","appointment-service","billing-service","auth-service","frontend") {
  kubectl -n hospital set image deployment/$s $s=YOUR_DOCKERHUB_USERNAME/${s}:v1
}
kubectl get pods -n hospital -w
```

Open the app (keep this running in its own terminal):

```powershell
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8088:80
# UI + all APIs at http://localhost:8088
```

> The frontend bakes its API URL in at build time. The pipelines use `http://localhost:8088`, which is why
> the port-forward must use 8088. For AWS EKS, rebuild the frontend with `API_BASE=http://<alb-dns-name>`.

## 10. Monitoring: Prometheus and Grafana

Every service now exposes `/actuator/prometheus`. Deploy the stack:

```powershell
kubectl apply -f k8s/monitoring/01-prometheus.yaml
kubectl -n monitoring create secret generic grafana-admin --from-literal=GF_SECURITY_ADMIN_PASSWORD='choose-a-strong-password'
kubectl apply -f k8s/monitoring/02-grafana.yaml

kubectl -n monitoring port-forward svc/prometheus 9090:9090     # terminal A
kubectl -n monitoring port-forward svc/grafana 3000:3000        # terminal B
```

- Prometheus → http://localhost:9090/targets: all 5 `hospital-services` targets should be **UP**.
- Grafana → http://localhost:3000 (user `admin`): the Prometheus data source is already configured.
  **Dashboards → New → Import**, enter ID **4701** (JVM Micrometer), pick the Prometheus data source.
  If that ID doesn't load, search grafana.com/dashboards for "JVM Micrometer".
- Useful queries: `up`, `jvm_memory_used_bytes`, `rate(http_server_requests_seconds_count[1m])`.

## 11. Verify the whole flow

- [ ] `docker compose up --build` works and http://localhost:8080 loads; register/login works
- [ ] GitHub Actions run is green; 6 images visible on Docker Hub
- [ ] Jenkins build is green through *Deploy*
- [ ] `kubectl get pods -n hospital` shows 8 pods `Running` (mysql, kafka, 5 services, frontend)
- [ ] http://localhost:8088 loads, register/login works, book an appointment, a bill appears (Kafka path)
- [ ] Prometheus targets UP and a Grafana dashboard shows data

## 12. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `ImagePullBackOff` | Wrong Docker Hub username in the image, repo is private, or the push failed. `kubectl describe pod -n hospital <pod>` |
| Jenkins: `docker`/`kubectl` not recognized | Jenkins is running as a service/other user. Start it from your own terminal (section 8) |
| Test stage fails with DB or Kafka errors | Untick `RUN_TESTS` to proceed, then see "Known gaps" below |
| UI loads but data fails / CORS errors | Frontend built with the wrong `API_BASE`. It must equal the URL in your browser (`http://localhost:8088`) |
| Pods `Pending` or restarting | Minikube out of memory. `minikube stop; minikube start --cpus=4 --memory=8g` |
| `auth-service` stuck `CreateContainerConfigError` | `auth-secret` missing. Create it (section 9) |
| Grafana pod `CreateContainerConfigError` | `grafana-admin` secret missing (section 10) |
| Jenkins won't start on 8080 | Compose frontend uses 8080. Use `--httpPort=8090` |

## 13. Known gaps (not changed, worth knowing)

- **Tests are only `contextLoads()`** that boot the whole app and need MySQL. They prove the app starts, not
  that endpoints behave. Add real unit/integration tests if the assignment grades testing.
- **Credentials are hardcoded** in `application.properties`, `docker-compose.yml` and `k8s/01-config.yaml`
  (`root/root`, a default JWT secret). Fine for a demo, not for a real deployment.
- **`k8s/aws-deploy.sh` only knows the original 4 services.** For EKS, add `auth-service` and `frontend`
  to its `SERVICES` list and rebuild the frontend with the ALB URL as `API_BASE`.
- MySQL and Kafka run as single-replica Deployments (see `k8s/README.md` for the production notes).
