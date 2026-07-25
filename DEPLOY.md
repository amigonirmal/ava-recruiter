# AVA Recruiter — GCP Deployment Guide

## Architecture

```
Cloud Run (port 8080)
└── Node 20 container
    ├── GET  /api/jobs          ← jobs from local data/jobs.json
    ├── POST /api/jobs          ← persist locally + upload to GCS
    ├── GET  /healthz           ← Cloud Run health check
    └── GET  /*                 ← React SPA (served from /dist)
```

In production, `data/jobs.json` inside the container is the **primary** store
(written synchronously). GCS (`gs://ava-storage-bucket/data/jobs.json`) receives
an async copy on every POST — used for backup and cross-deployment continuity.

> **Note**: Cloud Run containers are ephemeral. Jobs written during a revision
> live only while that instance is running. The GCS copy is the durable record;
> a future improvement would read from GCS on cold-start instead of the seed file.

---

## One-time GCP Setup

### 1. Enable APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com
```

### 2. Create Artifact Registry repository

```bash
gcloud artifacts repositories create ava-recruiter \
  --repository-format=docker \
  --location=europe-west2 \
  --description="AVA Recruiter Docker images"
```

### 3. Create a dedicated service account for Cloud Run

```bash
gcloud iam service-accounts create ava-recruiter-sa \
  --display-name="AVA Recruiter Cloud Run SA"
```

### 4. Grant the service account access to GCS bucket

```bash
# Storage Object Admin on the specific bucket
gcloud storage buckets add-iam-policy-binding gs://ava-storage-bucket \
  --member="serviceAccount:ava-recruiter-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### 5. Allow Cloud Build to deploy with the service account

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Cloud Build SA needs permission to act as the Cloud Run SA
gcloud iam service-accounts add-iam-policy-binding \
  ava-recruiter-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Cloud Build SA needs to deploy Cloud Run services
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
```

---

## Deploy

### Automated (Cloud Build)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions \
    _REGION=europe-west2,\
    _REPO=ava-recruiter,\
    _SERVICE=ava-recruiter,\
    _GCS_BUCKET=ava-storage-bucket
```

### Manual (local Docker → Cloud Run)

```bash
# 1. Build
docker build -t europe-west2-docker.pkg.dev/$PROJECT_ID/ava-recruiter/ava-recruiter:latest .

# 2. Push
docker push europe-west2-docker.pkg.dev/$PROJECT_ID/ava-recruiter/ava-recruiter:latest

# 3. Deploy
gcloud run deploy ava-recruiter \
  --image=europe-west2-docker.pkg.dev/$PROJECT_ID/ava-recruiter/ava-recruiter:latest \
  --region=europe-west2 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --service-account=ava-recruiter-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars=NODE_ENV=production,GCS_BUCKET=ava-storage-bucket
```

---

## Local Development

### Run both processes together

```bash
# Terminal 1 — API server (port 3001)
cd api && npm install && npm run dev

# Terminal 2 — Vite dev server (port 5173, proxies /api → :3001)
npm run dev
```

Or use `concurrently`:

```bash
npm install --save-dev concurrently
# Then run:
npx concurrently "node --watch api/server.js" "vite"
```

Vite's dev proxy (`/api` → `http://localhost:3001`) is already configured in
[`vite.config.js`](vite.config.js).

---

## GCS Bucket Reference

| Property | Value |
|---|---|
| Bucket | `gs://ava-storage-bucket` |
| Location | `europe-west1` (Belgium) |
| Object | `data/jobs.json` |
| Access | Uniform ACL, public access disabled |
| Encryption | Google-managed keys |
