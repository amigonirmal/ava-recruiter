# AVA Recruiter — GCP Cloud Run Deployment Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Docker | 24+ |
| gcloud CLI | latest |
| Node.js | 20+ |

---

## 1 — Enable GCP services (once per project)

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 2 — Create Artifact Registry repository (once)

```bash
gcloud artifacts repositories create ava-recruiter \
  --repository-format=docker \
  --location=europe-west2 \
  --description="AVA Recruiter container images"
```

---

## 3 — Authenticate Docker with Artifact Registry

```bash
gcloud auth configure-docker europe-west2-docker.pkg.dev
```

---

## 4 — Build and deploy via Cloud Build (recommended)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _REGION=europe-west2,_REPO=ava-recruiter,_SERVICE=ava-recruiter
```

This single command:
1. Builds the multi-stage Docker image (Node 20 → nginx:1.27)
2. Pushes to Artifact Registry
3. Deploys to Cloud Run with `--allow-unauthenticated`

---

## 5 — Manual local build + deploy (alternative)

```bash
# Build image
docker build -t europe-west2-docker.pkg.dev/YOUR_PROJECT/ava-recruiter/ava-recruiter:latest .

# Push image
docker push europe-west2-docker.pkg.dev/YOUR_PROJECT/ava-recruiter/ava-recruiter:latest

# Deploy
gcloud run deploy ava-recruiter \
  --image=europe-west2-docker.pkg.dev/YOUR_PROJECT/ava-recruiter/ava-recruiter:latest \
  --region=europe-west2 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi
```

---

## 6 — Automated CI/CD trigger (GitHub → Cloud Build → Cloud Run)

In GCP Console → Cloud Build → Triggers → Create Trigger:
- **Source**: GitHub repo `amigonirmal/ava-recruiter`, branch `^main$`
- **Config**: `cloudbuild.yaml`
- **Substitutions**: `_REGION=europe-west2`, `_REPO=ava-recruiter`, `_SERVICE=ava-recruiter`

Every push to `main` will automatically build and deploy.

---

## Architecture

```
GitHub (main)
    │  push
    ▼
Cloud Build
    │  docker build (Node 20 → nginx 1.27 alpine)
    │  docker push
    ▼
Artifact Registry
    │  image:$SHORT_SHA + :latest
    ▼
Cloud Run (managed)
    port 8080 · 256 Mi · 0–10 instances · unauthenticated
    │
    ▼
nginx serves /app/dist (Vite production build)
SPA fallback: all routes → index.html
Health check: GET /healthz → 200 ok
```

---

## Environment variables

| Variable | Where to set | Notes |
|----------|-------------|-------|
| `VITE_GOOGLE_CLIENT_ID` | Cloud Build substitution or Secret Manager | Google OAuth client ID |
| `NODE_ENV` | Already set to `production` in cloudbuild.yaml | |

To inject a build-time env var for Vite:

```yaml
# cloudbuild.yaml step — add before docker build
- name: 'bash'
  args:
    - '-c'
    - 'echo "VITE_GOOGLE_CLIENT_ID=$$GOOGLE_CLIENT_ID" > .env'
  secretEnv: ['GOOGLE_CLIENT_ID']
```
