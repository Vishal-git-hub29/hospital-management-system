# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# API base URL baked into the bundle by Vite at build time.
#   (empty)                  -> falls back to http://localhost:808x per service (docker compose)
#   http://localhost:8088    -> Kubernetes via ingress port-forward (all APIs path-routed)
#   http://<alb-dns-name>    -> AWS EKS
ARG API_BASE=""
ENV VITE_PATIENT_API=$API_BASE \
    VITE_DOCTOR_API=$API_BASE \
    VITE_APPOINTMENT_API=$API_BASE \
    VITE_BILLING_API=$API_BASE \
    VITE_AUTH_API=$API_BASE
RUN npm run build

# ---- Serve stage (static files via nginx) ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
