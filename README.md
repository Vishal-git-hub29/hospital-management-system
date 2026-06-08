# Hospital Management System — Microservices

A scalable Hospital Management System built with **Spring Boot microservices**. It demonstrates
CRUD operations, inter-service communication (**Spring Cloud OpenFeign** + **Apache Kafka**),
**circuit breaking with Resilience4j**, and containerized deployment with **Docker Compose**.

> 📄 **Full project report:** a detailed Word document with explanations, architecture diagrams, and
> app screenshots is available at
> [docs/Hospital_Management_System_Documentation.docx](docs/Hospital_Management_System_Documentation.docx)
> (see also [DOCUMENTATION.md](DOCUMENTATION.md)).

---

## Architecture

```
                         ┌──────────────────┐
                         │  Patient Service │  :8081   (MySQL)
                         └────────▲─────────┘
                                  │ Feign (sync, circuit-broken)
                         ┌────────┴─────────┐
                         │  Doctor Service  │  :8083   (MySQL)
                         └──────────────────┘

   ┌──────────────────────┐   Kafka topic:   ┌──────────────────────┐
   │ Appointment Service  │  appointment-    │   Billing Service    │
   │        :8084         │ ───topic──────►  │        :8085         │
   │   (MySQL, producer)  │                  │  (MySQL, consumer)   │
   └──────────────────────┘                  └──────────────────────┘
```

| Service | Port | Database | Responsibility |
|---|---|---|---|
| **patient-service** | 8081 | MySQL `hospital_db` | Patient CRUD + multi-criteria search query |
| **doctor-service** | 8083 | MySQL `hospital_db` | Doctor CRUD; calls Patient Service via Feign with Resilience4j circuit breaker |
| **appointment-service** | 8084 | MySQL `hospital_db` | Appointment CRUD; validates patient/doctor via Feign; publishes events to Kafka |
| **billing-service** | 8085 | MySQL `hospital_db` | Consumes appointment events from Kafka and generates bills |
| **auth-service** | 8086 | MySQL `hospital_db` | User registration/login with JWT, BCrypt hashing, and input validation |

**Infrastructure:** MySQL 8.4, Apache Kafka 3.7 (+ Zookeeper) — all defined in [docker-compose.yml](docker-compose.yml).

---

## Tech Stack

- Java 17, Spring Boot 3.5.x
- Spring Data JPA + MySQL
- Spring Cloud OpenFeign (synchronous inter-service calls)
- Spring Cloud Circuit Breaker — Resilience4j
- Apache Kafka (event-driven communication)
- Spring Boot Actuator (circuit-breaker observability)
- Lombok
- Docker / Docker Compose

---

## Running the project

### Option A — Docker Compose (recommended)

Builds and runs all four services plus MySQL, Kafka, and the React frontend:

```bash
docker compose up --build
```

Services become available at:
- **Frontend (UI): http://localhost:8080** (log in / register first)
- Patient: http://localhost:8081/patients
- Doctor: http://localhost:8083/doctors
- Appointment: http://localhost:8084/appointments
- Billing: http://localhost:8085/bills
- Auth: http://localhost:8086/auth

### Option B — Run a single service locally

Each service is a standalone Maven project. You'll need MySQL and Kafka running
(adjust the `mysql`/`kafka` hostnames in `application.properties` to `localhost`).

```bash
cd patient-service
./mvnw spring-boot:run
```

---

## API Reference

### Patient Service (`:8081`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/patients` | Create a patient |
| `GET` | `/patients` | List all patients |
| `GET` | `/patients/{id}` | Get patient by ID |
| `PUT` | `/patients/{id}` | Update a patient |
| `DELETE` | `/patients/{id}` | Delete a patient |
| `GET` | `/patients/search?name=&age=&department=` | **Multi-criteria search** (any combination of params) |

**Patient body:** `{ "name", "age", "gender", "department", "phone" }`

**Complex query** — implemented in [PatientRepository](patient-service/src/main/java/com/hospital/patientservice/repository/PatientRepository.java).
Each criterion is optional (`NULL`-safe), so the same query handles searching by name only,
age only, department only, or any combination:

```java
@Query("SELECT p FROM Patient p WHERE " +
       "(:name IS NULL OR p.name = :name) AND " +
       "(:age IS NULL OR p.age = :age) AND " +
       "(:department IS NULL OR p.department = :department)")
List<Patient> searchPatients(@Param("name") String name,
                             @Param("age") Integer age,
                             @Param("department") String department);
```

### Doctor Service (`:8083`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/doctors` | Create a doctor |
| `GET` | `/doctors` | List all doctors |
| `GET` | `/doctors/{id}` | Get doctor by ID |
| `PUT` | `/doctors/{id}` | Update a doctor |
| `DELETE` | `/doctors/{id}` | Delete a doctor |
| `GET` | `/doctors/{doctorId}/patient/{patientId}` | **Feign call** — returns doctor + patient (circuit-broken) |

**Doctor body:** `{ "name", "specialization", "experience", "phone" }`

### Appointment Service (`:8084`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/appointments` | Book an appointment (**validates patient + doctor via Feign**, then publishes a Kafka event) |
| `GET` | `/appointments` | List all appointments |
| `GET` | `/appointments/{id}` | Get appointment by ID |
| `PUT` | `/appointments/{id}` | Update an appointment |
| `DELETE` | `/appointments/{id}` | Delete an appointment |

**Appointment body:** `{ "patientId", "doctorId", "appointmentDate", "status" }`

### Billing Service (`:8085`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/bills` | List all bills |
| `GET` | `/bills/{id}` | Get bill by ID |
| `PUT` | `/bills/{id}/status?status=` | Update a bill's status |
| `DELETE` | `/bills/{id}` | Delete a bill |

Bills are **created automatically** when an appointment is booked (via Kafka), not via a POST endpoint.

---

## Inter-Service Communication

### 1. Spring Feign Client (Doctor → Patient)

[PatientFeignClient](doctor-service/src/main/java/com/hospital/doctorservice/feign/PatientFeignClient.java)
declaratively calls the Patient Service. Used by
`GET /doctors/{doctorId}/patient/{patientId}` to combine doctor and patient data into a
[DoctorPatientResponse](doctor-service/src/main/java/com/hospital/doctorservice/dto/DoctorPatientResponse.java).

### 2. Spring Feign Client (Appointment → Patient & Doctor)

Before booking, the Appointment Service confirms the referenced patient and doctor actually exist
by calling the Patient Service and Doctor Service via Feign
([PatientFeignClient](appointment-service/src/main/java/com/hospital/appointmentservice/feign/PatientFeignClient.java),
[DoctorFeignClient](appointment-service/src/main/java/com/hospital/appointmentservice/feign/DoctorFeignClient.java)).
If either lookup fails, the booking is rejected with `400 Bad Request` and a clear message
(`InvalidAppointmentException`) instead of persisting an appointment that points at non-existent records.

### 3. Kafka (Appointment → Billing)

- **Producer:** [AppointmentProducer](appointment-service/src/main/java/com/hospital/appointmentservice/kafka/AppointmentProducer.java)
  publishes a JSON appointment event to the `appointment-topic` topic when an appointment is booked.
- **Consumer:** [BillingConsumer](billing-service/src/main/java/com/hospital/billingservice/kafka/BillingConsumer.java)
  (group `billing-group`) listens to `appointment-topic` and generates a bill.

---

## Circuit Breaking (Resilience4j)

The Doctor Service guards its Feign call to the Patient Service with a Resilience4j circuit breaker
(see [DoctorServiceImpl](doctor-service/src/main/java/com/hospital/doctorservice/service/DoctorServiceImpl.java)):

```java
@CircuitBreaker(name = "patientService", fallbackMethod = "patientServiceFallback")
public DoctorPatientResponse getDoctorWithPatient(Long doctorId, Long patientId) { ... }
```

If the Patient Service is down or slow, the breaker opens and the call falls back to a
placeholder patient ("Patient Service Unavailable") instead of failing the whole request.

**Configuration** (in `doctor-service/application.properties`):

| Property | Value | Meaning |
|---|---|---|
| `sliding-window-size` | 10 | Number of calls evaluated |
| `minimum-number-of-calls` | 5 | Calls before the rate is computed |
| `failure-rate-threshold` | 50% | Opens the breaker above this failure rate |
| `wait-duration-in-open-state` | 10s | Time before trying half-open |
| `permitted-number-of-calls-in-half-open-state` | 3 | Trial calls in half-open |

**Observe the breaker state** via Actuator:
```
GET http://localhost:8083/actuator/health
GET http://localhost:8083/actuator/circuitbreakers
```

**To demo the fallback:** stop the Patient Service container, then repeatedly call
`GET /doctors/{doctorId}/patient/{patientId}`. After a few failures the breaker opens and you'll
get the fallback response immediately.

---

## Project Status (vs. assignment requirements)

| Requirement | Status |
|---|---|
| 4 microservices (Patient, Doctor, Appointment, Billing) | ✅ Done |
| CRUD for each service | ✅ Done |
| Feign Client (Doctor → Patient) | ✅ Done |
| Kafka (Appointment → Billing) | ✅ Done |
| Resilience4j circuit breaking (Doctor) | ✅ Done (+ tuned config & actuator) |
| Complex multi-criteria query (Patient) | ✅ Done |
| Docker | ✅ Done (Dockerfiles + docker-compose) |
| Appointment → Patient/Doctor validation | ✅ Done (Feign validation before booking) |
| Relational database + complex query | ✅ Done — MySQL used in place of Oracle ([rationale](#database-choice-mysql-in-place-of-oracle)) |
| Kubernetes / AWS deployment | ✅ Done — manifests + EKS guide in [k8s/](k8s/) |
| React Hooks frontend | ✅ Done — Vite + React Hooks app in [frontend/](frontend/) |
| Login / Logout (JWT auth) | ✅ Done — auth-service + frontend gating |
| Input validation (gmail email, password rules) | ✅ Done — Bean Validation in auth-service |
| Pagination + Sorting | ✅ Done — all list endpoints + UI controls |

---

## Database Choice: MySQL in place of Oracle

The assignment brief names **Oracle** as the database. This project uses **MySQL 8.4** instead. The
substitution is deliberate and does not affect the requirement being demonstrated — *a complex,
multi-criteria relational query* — because the implementation relies only on standard, portable
features.

**Why MySQL:**

- **Zero-cost, container-friendly.** MySQL ships as a small official Docker image
  (`mysql:8.4`) with no licensing or registration, so `docker compose up` works on any machine
  and in CI. Oracle XE images require an Oracle account and are multi-GB, which complicates the
  Docker/Kubernetes deliverables.
- **The complex query is database-agnostic.** The multi-criteria search uses JPQL with
  `NULL`-safe optional predicates (see [PatientRepository](patient-service/src/main/java/com/hospital/patientservice/repository/PatientRepository.java)).
  JPQL is translated by Hibernate to the target dialect, so the same query runs unchanged on Oracle.
- **No MySQL-specific SQL is used.** Entities use JPA annotations and `ddl-auto=update`; there are
  no vendor-specific column types, sequences, or functions that would tie the schema to MySQL.

**Porting to Oracle** (if required) is a configuration change, not a code change:

1. Swap the connector dependency `com.mysql:mysql-connector-j` → `com.oracle.database.jdbc:ojdbc11`.
2. Update each service's `application.properties`:
   ```properties
   spring.datasource.url=jdbc:oracle:thin:@oracle:1521/XEPDB1
   spring.datasource.username=hospital
   spring.datasource.password=hospital
   spring.jpa.database-platform=org.hibernate.dialect.OracleDialect
   ```
3. Replace the `mysql` service in [docker-compose.yml](docker-compose.yml) with
   `gvenzl/oracle-xe` (or the official Oracle XE image).

No application/entity/repository Java code changes — the JPA + JPQL abstraction was chosen precisely
so the persistence layer stays vendor-neutral.

---

## Repository Layout

```
hospital-management-system/
├── docker-compose.yml          # MySQL + Kafka + all 4 services
├── patient-service/            # Port 8081
├── doctor-service/             # Port 8083  (Feign + Resilience4j)
├── appointment-service/        # Port 8084  (Feign validation + Kafka producer)
├── billing-service/            # Port 8085  (Kafka consumer)
├── auth-service/               # Port 8086  (JWT login/register + validation)
├── frontend/                   # Port 8080  (React Hooks SPA, Vite + nginx)
├── k8s/                        # Kubernetes manifests + AWS EKS deploy guide
└── README.md
```

---

## Authentication (auth-service + JWT)

A dedicated **auth-service** (`:8086`) handles login/registration using **Spring Security**, **JWT**,
and **BCrypt** password hashing. The frontend is gated: you must log in or register before reaching
the app, and a **Logout** button clears the session.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account → returns a JWT |
| `POST` | `/auth/login` | Authenticate → returns a JWT |

**Validation** (Jakarta Bean Validation on the request DTOs, see
[RegisterRequest](auth-service/src/main/java/com/hospital/authservice/dto/RegisterRequest.java)):

- **Email is mandatory and must be a `@gmail.com` address** (`@NotBlank` + `@Email` + `@Pattern`).
- **Password rules** — at least 8 characters with an uppercase letter, a lowercase letter, a digit,
  and a special character (`@$!%*?&#`).
- Failed validation returns `400` with **per-field error messages** the UI shows next to each input.

```bash
# Valid — returns a token
curl -X POST localhost:8086/auth/register -H 'Content-Type: application/json' \
  -d '{"fullName":"Test User","email":"testuser@gmail.com","password":"Test@1234"}'

# Rejected — non-gmail email → 400 "Email must be a @gmail.com address"
curl -X POST localhost:8086/auth/register -H 'Content-Type: application/json' \
  -d '{"fullName":"X","email":"x@yahoo.com","password":"Test@1234"}'
```

---

## Pagination & Sorting

Every list endpoint is paginated and sortable via Spring Data `Pageable` — pass `page`, `size`, and
`sort` query params. The default page size is 5.

```bash
curl "localhost:8081/patients?page=0&size=5&sort=name,asc"
curl "localhost:8085/bills?page=1&size=10&sort=amount,desc"
```

The response is a standard Spring `Page` (`content`, `totalElements`, `totalPages`, `number`). The
React UI renders **Prev/Next controls, a page indicator, and a sort dropdown** on all four list tabs.

---

## Frontend (React Hooks)

A Vite + **React 18 Hooks** single-page app lives in [frontend/](frontend/). It provides full CRUD
for all four services through a tabbed UI, plus the multi-criteria patient search and live display
of Kafka-generated bills.

- **Hooks used:** `useState`, `useEffect`, `useCallback`, and a reusable custom hook
  `useFetch(fetchFn, deps)` ([frontend/src/api.js](frontend/src/api.js)) that every page shares.
- The four backend services have **CORS enabled** (`WebConfig` in each service) so the browser can
  call them directly. API base URLs are configurable via `.env` (see `frontend/.env.example`).

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (backend must be running)
```

Or just `docker compose up --build` and open **http://localhost:8080** (the frontend is included
in compose, served by nginx).

---

## Kubernetes / AWS Deployment

Full Kubernetes manifests live in [k8s/](k8s/) with a step-by-step guide for both a local
cluster (minikube/kind) and **AWS EKS** (ECR push, EBS CSI driver, AWS Load Balancer Controller).
The Kubernetes Service names match the hostnames already used in code (`mysql`, `kafka`,
`patient-service`, …), so Feign, Kafka, and JDBC work in-cluster with **no code changes**.

```bash
kubectl apply -f k8s/
kubectl get pods -n hospital -w
```
