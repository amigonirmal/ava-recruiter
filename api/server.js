/**
 * AVA Recruiter — API Server
 *
 * Routes:
 *   GET  /api/jobs          → return all jobs (from local JSON)
 *   POST /api/jobs          → append a new job, persist locally + upload to GCS
 *   GET  /healthz           → health check for Cloud Run
 *
 * In production (Cloud Run) Node also serves the pre-built React SPA from /dist.
 *
 * Env vars (set in Cloud Run / .env.local for dev):
 *   PORT              default 3001  (Cloud Run injects 8080)
 *   GCS_BUCKET        GCS bucket name, e.g. ava-storage-bucket
 *   GCS_JOBS_OBJECT   object path inside bucket, default data/jobs.json
 *   NODE_ENV          production | development
 */

const express   = require('express')
const cors      = require('cors')
const fs        = require('fs')
const path      = require('path')
const { randomUUID } = require('crypto')

const app  = express()
const PORT = process.env.PORT || 3001

// ── Data store path (relative to repo root, i.e. /app in Docker) ─────────────
const DATA_DIR  = path.resolve(__dirname, '..', 'data')
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json')

// ── GCS (optional — only active when GCS_BUCKET is set) ─────────────────────
const GCS_BUCKET = process.env.GCS_BUCKET || ''
const GCS_OBJECT = process.env.GCS_JOBS_OBJECT || 'data/jobs.json'
let gcsBucket = null

if (GCS_BUCKET) {
  try {
    const { Storage } = require('@google-cloud/storage')
    gcsBucket = new Storage().bucket(GCS_BUCKET)
    console.log(`[gcs] will persist to gs://${GCS_BUCKET}/${GCS_OBJECT}`)
  } catch (err) {
    console.warn('[gcs] @google-cloud/storage not available — GCS disabled:', err.message)
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJobs() {
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeJobs(jobs) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2))
}

async function uploadToGcs(jobs) {
  if (!gcsBucket) return
  try {
    await gcsBucket.file(GCS_OBJECT).save(JSON.stringify(jobs, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    })
    console.log(`[gcs] uploaded ${jobs.length} jobs → gs://${GCS_BUCKET}/${GCS_OBJECT}`)
  } catch (err) {
    // Non-fatal — local file is the source of truth inside the container
    console.error('[gcs] upload failed (non-fatal):', err.message)
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }))

// GET /api/jobs
app.get('/api/jobs', (_req, res) => {
  const jobs = readJobs()
  res.json(jobs)
})

// POST /api/jobs
app.post('/api/jobs', async (req, res) => {
  const body = req.body
  if (!body || !body.title) {
    return res.status(400).json({ error: 'title is required' })
  }

  const newJob = {
    id:          body.id          || randomUUID(),
    title:       body.title,
    dept:        body.dept        || body.department || '',
    location:    body.location    || '',
    type:        body.type        || 'Full-time',
    seniority:   body.seniority   || 'Mid',
    urgency:     body.urgency     || 'Medium',
    salary:      body.salary      || '',
    description: body.description || '',
    requirements:body.requirements|| '',
    niceToHave:  body.niceToHave  || '',
    closingDate: body.closingDate || '',
    applicants:  0,
    matched:     0,
    postedAt:    new Date().toISOString(),
  }

  const jobs = readJobs()
  jobs.unshift(newJob)          // newest first
  writeJobs(jobs)
  await uploadToGcs(jobs)

  console.log(`[jobs] posted: ${newJob.title} (id=${newJob.id})`)
  res.status(201).json(newJob)
})

// ── Serve built React SPA in production ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const DIST = path.resolve(__dirname, '..', 'dist')
  app.use(express.static(DIST))
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' })
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ava-api] listening on http://0.0.0.0:${PORT}`)
  console.log(`[ava-api] NODE_ENV=${process.env.NODE_ENV || 'development'}`)
  console.log(`[ava-api] jobs file: ${JOBS_FILE}`)
})
