# Hospital Management System — Project Documentation

A scalable **Hospital Management System** built using a **microservices architecture** with Spring
Boot, demonstrating CRUD operations, inter-service communication (Spring Cloud OpenFeign + Apache
Kafka), circuit breaking (Resilience4j), a complex multi-criteria query, JWT authentication,
pagination & sorting, input validation, a React Hooks frontend, and containerized deployment with
Docker and Kubernetes.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Prerequisites](#4-prerequisites)
5. [Project Structure](#5-project-structure)
6. [How to Run the Project](#6-how-to-run-the-project)
7. [The Microservices](#7-the-microservices)
8. [Inter-Service Communication](#8-inter-service-communication)
9. [Circuit Breaking (Resilience4j)](#9-circuit-breaking-resilience4j)
10. [Complex Query](#10-complex-query)
11. [Authentication & Validation](#11-authentication--validation)
12. [Pagination & Sorting](#12-pagination--sorting)
13. [Database](#13-database)
14. [Frontend (React Hooks)](#14-frontend-react-hooks)
15. [Deployment (Docker & Kubernetes)](#15-deployment-docker--kubernetes)
16. [Testing & Verification](#16-testing--verification)
17. [Troubleshooting](#17-troubleshooting)
18. [Requirement → Implementation Map](#18-requirement--implementation-map)

---

## 1. System Overview

The system is split into **five backend microservices** plus a **React frontend**, each independently
deployable and communicating over HTTP (synchronous) and Kafka (asynchronous events):

| Service | Port | Responsibility |
|---------|------|----------------|
| **patient-service** | 8081 | Patient CRUD + complex multi-criteria search |
| **doctor-service** | 8083 | Doctor CRUD; calls Patient Service via Feign with a Resilience4j circuit breaker |
| **appointment-service** | 8084 | Appointment CRUD; validates patient/doctor via Feign; publishes events to Kafka |
| **billing-service** | 8085 | Consumes Kafka appointment events and auto-generates bills |
| **auth-service** | 8086 | User registration/login with JWT, BCrypt hashing, and input validation |
| **frontend** | 8080 | React Hooks single-page app (served by nginx) |

Supporting infrastructure: **MySQL 8.4** (shared database `hospital_db`) and **Apache Kafka 3.7**
(KRaft mode, no Zookeeper).

---

## 2. Architecture

```
                            ┌───────────────────┐
        Feign (sync) ──────►│  Patient Service  │  :8081   (MySQL)
        circuit-broken      └───────────────────┘
                                     ▲
                                     │ Feign
                            ┌────────┴──────────┐
                            │   Doctor Service  │  :8083   (MySQL)
                            └───────────────────┘

   ┌────────────────────┐   validates via Feign   ┌──────────────────┐
   │ Appointment Service│ ──────────────────────► │ Patient + Doctor │
   │       :8084        │                          └──────────────────┘
   │  (MySQL, producer) │
   └─────────┬──────────┘
             │ Kafka topic: appointment-topic
             ▼
   ┌────────────────────┐
   │  Billing Service   │  :8085   (MySQL, consumer) → auto-creates bills
   └────────────────────┘

   ┌────────────────────┐        ┌────────────────────┐
   │   Auth Service     │        │   React Frontend   │  :8080
   │   :8086 (JWT)      │ ◄───── │  (login gates app) │
   └────────────────────┘        └────────────────────┘
```

**Communication patterns**
- **Synchronous (Feign):** doctor→patient, appointment→patient, appointment→doctor.
- **Asynchronous (Kafka):** appointment→billing (event-driven, decoupled).
- **Resilience:** the doctor→patient Feign call is protected by a circuit breaker with a fallback.

---

## 3. Technology Stack

- **Java 17**, **Spring Boot 3.5.x**
- **Spring Data JPA** + **MySQL 8.4**
- **Spring Cloud OpenFeign** — declarative inter-service HTTP calls
- **Spring Cloud Circuit Breaker / Resilience4j** — fault tolerance
- **Apache Kafka 3.7** (KRaft) — event streaming
- **Spring Security + JWT (jjwt) + BCrypt** — authentication
- **Jakarta Bean Validation** — input validation
- **Spring Boot Actuator** — circuit-breaker observability
- **Lombok**
- **React 18 + Vite** (Hooks) — frontend
- **Docker / Docker Compose** — containerization
- **Kubernetes** (manifests + AWS EKS guide) — orchestration

---

## 4. Prerequisites

To run with Docker (recommended) you only need:

- **Docker Desktop** (includes Docker Engine + Docker Compose)

To run services individually for development you also need:

- **JDK 17+**
- **Node.js 18+** and **npm** (for the frontend)
- A local **MySQL** and **Kafka** (or point the services at the Docker ones)

> Each service ships a **Maven Wrapper** (`mvnw`), so a separate Maven install is not required.

---

## 5. Project Structure

```
hospital-management-system/
├── docker-compose.yml          # Orchestrates MySQL, Kafka, all services + frontend
├── README.md                   # Quick-start + overview
├── DOCUMENTATION.md            # This file
├── patient-service/            # :8081  CRUD + complex query
├── doctor-service/             # :8083  Feign + Resilience4j
├── appointment-service/        # :8084  Feign validation + Kafka producer
├── billing-service/            # :8085  Kafka consumer
├── auth-service/               # :8086  JWT login/register + validation
├── frontend/                   # :8080  React Hooks SPA (Vite + nginx)
└── k8s/                        # Kubernetes manifests + AWS EKS deploy guide
```

Each backend service follows the same layered layout:

```
src/main/java/com/hospital/<service>/
├── <Service>Application.java   # Spring Boot entry point
├── controller/                 # REST endpoints
├── service/                    # Business logic (interface + impl)
├── repository/                 # Spring Data JPA repositories
├── entity/                     # JPA entities
├── dto/                        # Data transfer objects
├── config/                     # CORS / web config
└── exception/                  # Custom exceptions + global handler
```

---

## 6. How to Run the Project

### Option A — Docker Compose (recommended)

This builds and runs **everything** (MySQL, Kafka, all 5 services, and the frontend) with one
command. Each service compiles inside Docker via a multi-stage build, so no manual build step is
needed.

```bash
# From the project root
docker compose up --build
```

Wait until all containers are healthy (first run downloads images and compiles — a few minutes).
Then open:

| What | URL |
|------|-----|
| **Frontend (start here)** | http://localhost:8080 |
| Patient API | http://localhost:8081/patients |
| Doctor API | http://localhost:8083/doctors |
| Appointment API | http://localhost:8084/appointments |
| Billing API | http://localhost:8085/bills |
| Auth API | http://localhost:8086/auth |

Useful commands:

```bash
docker compose up --build -d     # run in the background
docker compose ps                # list containers + status
docker compose logs -f doctor-service   # tail one service's logs
docker compose down              # stop everything
docker compose down -v           # stop and wipe the database volume
```

**First use:** open http://localhost:8080, click **Register**, sign up with a `@gmail.com` email and
a strong password (e.g. `Test@1234`), then log in.

### Option B — Run a single service locally (development)

Each service is a standalone Maven project. Start MySQL and Kafka first (e.g. via
`docker compose up mysql kafka`), then:

```bash
cd patient-service
./mvnw spring-boot:run
```

> When running outside Docker, change the `mysql`/`kafka` hostnames in `application.properties` to
> `localhost`.

### Option C — Frontend in dev mode (hot reload)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (backend must be running)
```

---

## 7. The Microservices

### Patient Service (`:8081`)
CRUD for patients plus the complex multi-criteria search.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/patients` | Create a patient |
| GET | `/patients?page=&size=&sort=` | List patients (paginated + sortable) |
| GET | `/patients/{id}` | Get patient by ID |
| PUT | `/patients/{id}` | Update a patient |
| DELETE | `/patients/{id}` | Delete a patient |
| GET | `/patients/search?name=&age=&department=` | Multi-criteria search |

**Body:** `{ "name", "age", "gender", "department", "phone" }`

### Doctor Service (`:8083`)
CRUD for doctors plus the Feign + circuit-breaker endpoint.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/doctors` | Create a doctor |
| GET | `/doctors?page=&size=&sort=` | List doctors (paginated + sortable) |
| GET | `/doctors/{id}` | Get doctor by ID |
| PUT | `/doctors/{id}` | Update a doctor |
| DELETE | `/doctors/{id}` | Delete a doctor |
| GET | `/doctors/{doctorId}/patient/{patientId}` | Doctor + patient via Feign (circuit-broken) |

**Body:** `{ "name", "specialization", "experience", "phone" }`

### Appointment Service (`:8084`)
CRUD for appointments. Validates the patient and doctor exist (via Feign) before saving, then
publishes a Kafka event.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/appointments` | Book (validates patient+doctor via Feign, publishes Kafka event) |
| GET | `/appointments?page=&size=&sort=` | List appointments (paginated + sortable) |
| GET | `/appointments/{id}` | Get by ID |
| PUT | `/appointments/{id}` | Update |
| DELETE | `/appointments/{id}` | Delete |

**Body:** `{ "patientId", "doctorId", "appointmentDate", "status" }`

### Billing Service (`:8085`)
Consumes Kafka appointment events and generates a bill automatically. No POST endpoint — bills are
created by the event.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bills?page=&size=&sort=` | List bills (paginated + sortable) |
| GET | `/bills/{id}` | Get bill by ID |
| PUT | `/bills/{id}/status?status=` | Update a bill's status |
| DELETE | `/bills/{id}` | Delete a bill |

### Auth Service (`:8086`)
See [section 11](#11-authentication--validation).

---

## 8. Inter-Service Communication

### Spring Cloud OpenFeign (synchronous)
- **Doctor → Patient:** `GET /doctors/{doctorId}/patient/{patientId}` combines a doctor with patient
  data fetched from Patient Service via `PatientFeignClient`.
- **Appointment → Patient & Doctor:** before booking, Appointment Service confirms both exist via
  `PatientFeignClient` and `DoctorFeignClient`. A missing reference returns `400 Bad Request`
  (`InvalidAppointmentException`) instead of persisting an orphaned record.

### Apache Kafka (asynchronous)
- **Producer:** `AppointmentProducer` (appointment-service) publishes a JSON appointment event to
  the `appointment-topic` topic when an appointment is booked.
- **Consumer:** `BillingConsumer` (billing-service, group `billing-group`) listens to
  `appointment-topic` and generates a bill.

This decouples billing from appointments — billing can be down and still catch up later.

---

## 9. Circuit Breaking (Resilience4j)

The doctor→patient Feign call is wrapped with a Resilience4j circuit breaker
(`DoctorServiceImpl.getDoctorWithPatient`). If Patient Service is down/slow, the breaker opens and
the call falls back to a placeholder patient instead of failing the whole request.

**Configuration** (`doctor-service/application.properties`):

| Property | Value |
|----------|-------|
| sliding-window-size | 10 |
| minimum-number-of-calls | 5 |
| failure-rate-threshold | 50% |
| wait-duration-in-open-state | 10s |
| permitted-number-of-calls-in-half-open-state | 3 |

**Observe the breaker:**
```
GET http://localhost:8083/actuator/health
GET http://localhost:8083/actuator/circuitbreakers
```

**Demo:** stop Patient Service (`docker compose stop patient-service`), then repeatedly call
`GET /doctors/{doctorId}/patient/{patientId}` — after a few failures the breaker opens and you get
the fallback response instantly.

---

## 10. Complex Query

Implemented in `PatientRepository.searchPatients(...)` as a single dynamic, NULL-safe JPQL query
that handles any combination of criteria:

```java
@Query("SELECT p FROM Patient p WHERE " +
       "(:name IS NULL OR p.name = :name) AND " +
       "(:age IS NULL OR p.age = :age) AND " +
       "(:department IS NULL OR p.department = :department)")
List<Patient> searchPatients(@Param("name") String name,
                             @Param("age") Integer age,
                             @Param("department") String department);
```

Each criterion is optional — the same query searches by name only, department only, or any
combination — exposed via `GET /patients/search`.

> **Note on Oracle:** the assignment names Oracle; this project uses MySQL. The query is standard,
> portable JPQL (translated by Hibernate to the target dialect), so it runs unchanged on Oracle. See
> the "Database Choice" section in `README.md` for the rationale and the steps to switch to Oracle.

---

## 11. Authentication & Validation

A dedicated **auth-service** (`:8086`) handles sign-in using **Spring Security**, **JWT** (jjwt), and
**BCrypt** password hashing. The frontend is gated — users must log in or register first, and a
**Logout** button clears the session.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create an account → returns a JWT |
| POST | `/auth/login` | Authenticate → returns a JWT |

**Validation rules** (Jakarta Bean Validation on the request DTOs):

- **Email** — mandatory, valid format, and **must be a `@gmail.com` address**.
- **Password** — at least 8 characters with an uppercase letter, a lowercase letter, a digit, and a
  special character (`@$!%*?&#`).
- **Full name** — mandatory (registration).

Validation failures return `400` with **per-field messages** (`{ "errors": { "email": "..." } }`)
that the UI displays next to each input.

**Security model:** auth-service issues JWTs; the **frontend gates access** (the token is stored in
the browser's `localStorage`). The other microservices are not individually token-protected, which
keeps the Feign and Kafka flows simple. Passwords are stored only as BCrypt hashes in the `users`
table — never in plaintext.

```bash
# Register (valid) → returns a token
curl -X POST localhost:8086/auth/register -H 'Content-Type: application/json' \
  -d '{"fullName":"Test User","email":"testuser@gmail.com","password":"Test@1234"}'

# Login
curl -X POST localhost:8086/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"testuser@gmail.com","password":"Test@1234"}'
```

---

## 12. Pagination & Sorting

Every list endpoint is paginated and sortable via Spring Data `Pageable`. Pass `page`, `size`, and
`sort` query parameters (default page size is 5):

```bash
curl "localhost:8081/patients?page=0&size=5&sort=name,asc"
curl "localhost:8085/bills?page=1&size=10&sort=amount,desc"
```

The response is a standard Spring `Page` object (`content`, `totalElements`, `totalPages`,
`number`). The React UI renders **Prev/Next controls, a page indicator, and a sort dropdown** on all
four list tabs.

---

## 13. Database

- **Engine:** MySQL 8.4, database `hospital_db`, shared by all services (each owns its own tables).
- **Schema:** generated automatically from the JPA entities (`spring.jpa.hibernate.ddl-auto=update`).
- **Tables:** `patients`, `doctors`, `appointments`, `billing`, `users`.

Inspect the data directly:

```bash
docker compose exec mysql mysql -uroot -proot hospital_db -e "SHOW TABLES;"
docker compose exec mysql mysql -uroot -proot hospital_db -e "SELECT * FROM patients;"
docker compose exec mysql mysql -uroot -proot hospital_db -e "SELECT id, full_name, email FROM users;"
```

Passwords in the `users` table are BCrypt hashes (`$2a$10$...`), not plaintext.

---

## 14. Frontend (React Hooks)

A Vite + React 18 single-page app in `frontend/`, served by nginx in Docker on `:8080`.

- **Hooks used:** `useState`, `useEffect`, `useCallback`, and two custom hooks — `usePaged`
  (pagination/sort state) and `useAll` (full-list fetch for dropdowns), plus `useFetch`.
- **Pages:** Patients (CRUD + complex search), Doctors (CRUD), Appointments (CRUD + Feign-validated
  booking), Bills (status updates, shows patient/doctor names). All with pagination + sorting.
- **Auth:** a split-screen login/register page; session persists across refresh via `localStorage`.
- **Config:** API base URLs come from Vite env vars (`frontend/.env.example`).

```bash
cd frontend && npm install && npm run dev    # dev server on :5173
```

---

## 15. Deployment (Docker & Kubernetes)

### Docker
Every service (and the frontend) has a multi-stage `Dockerfile`; `docker-compose.yml` wires them
together with MySQL and Kafka. See [section 6](#6-how-to-run-the-project).

### Kubernetes / AWS
Full manifests live in `k8s/` (Namespace, ConfigMap/Secret, MySQL, Kafka, all services, and an
Ingress), with a step-by-step guide for both a local cluster (minikube) and **AWS EKS** (ECR push,
EBS CSI driver, AWS Load Balancer Controller). Because the Kubernetes Service names match the
hostnames used in code, Feign/Kafka/JDBC work in-cluster with no code changes.

```bash
kubectl apply -f k8s/
kubectl get pods -n hospital -w
```

See `k8s/README.md` for the complete deployment guide.

---

## 16. Testing & Verification

A quick end-to-end smoke test (with the stack running):

```bash
# 1. Create a patient and a doctor
curl -X POST localhost:8081/patients -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":30,"gender":"F","department":"Cardiology","phone":"555-1"}'
curl -X POST localhost:8083/doctors -H 'Content-Type: application/json' \
  -d '{"name":"Dr Rao","specialization":"Cardiology","experience":10,"phone":"555-2"}'

# 2. Book an appointment (validates patient+doctor via Feign, fires Kafka)
curl -X POST localhost:8084/appointments -H 'Content-Type: application/json' \
  -d '{"patientId":1,"doctorId":1,"appointmentDate":"2026-06-10"}'

# 3. A bill is auto-generated via Kafka
curl localhost:8085/bills

# 4. Feign validation rejects a bad reference (expect HTTP 400)
curl -X POST localhost:8084/appointments -H 'Content-Type: application/json' \
  -d '{"patientId":999,"doctorId":1,"appointmentDate":"2026-06-10"}'

# 5. Pagination + sorting
curl "localhost:8081/patients?page=0&size=2&sort=name,asc"

# 6. Auth validation (expect 400 for non-gmail / weak password)
curl -X POST localhost:8086/auth/register -H 'Content-Type: application/json' \
  -d '{"fullName":"X","email":"x@yahoo.com","password":"Test@1234"}'
```

**UI walkthrough:** open http://localhost:8080 → register → add patients/doctors → book an
appointment → see the bill appear under Bills → try the sort dropdown and Prev/Next.

---

## 17. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `docker compose up` fails to compile a service | Ensure Docker has enough memory (Settings → Resources, 4 GB+). |
| A service can't reach MySQL on startup | MySQL takes time to become healthy; services depend on its healthcheck and will retry. Re-run `docker compose up`. |
| Frontend shows old content after changes | Hard-refresh (`Cmd/Ctrl + Shift + R`); for Docker, `docker compose up --build -d frontend`. |
| CORS errors in the browser console | The services enable CORS via `WebConfig`. Make sure you're hitting the right ports. |
| Port already in use | Stop whatever uses 8080–8086/3306/9092, or change the host port mapping in `docker-compose.yml`. |
| Reset all data | `docker compose down -v` (drops the MySQL volume), then `docker compose up --build`. |

---

## 18. Requirement → Implementation Map

| Assignment requirement | Where it's implemented |
|------------------------|------------------------|
| 4 microservices + CRUD | patient / doctor / appointment / billing services |
| Spring Feign Client | `PatientFeignClient` (doctor + appointment), `DoctorFeignClient` (appointment) |
| Kafka | `AppointmentProducer` → `appointment-topic` → `BillingConsumer` |
| Resilience4j circuit breaking | `DoctorServiceImpl.getDoctorWithPatient` + config |
| Complex multi-criteria query | `PatientRepository.searchPatients` |
| Docker | `Dockerfile` per service + `docker-compose.yml` |
| Kubernetes / AWS | `k8s/` manifests + `k8s/README.md` |
| React Hooks frontend | `frontend/` |
| Login / Logout (auth) | `auth-service` + frontend gating |
| Validation (gmail email, password rules) | `auth-service` DTOs (Jakarta Bean Validation) |
| Pagination + Sorting | All list endpoints + frontend controls |
| Documentation | `README.md`, this `DOCUMENTATION.md`, `k8s/README.md`, `frontend/README.md` |
