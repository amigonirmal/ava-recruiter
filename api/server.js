/**
 * AVA Recruiter — API Server
 *
 * Routes:
 *   GET  /api/jobs                   → return all jobs (local JSON, restored from GCS on cold-start)
 *   POST /api/jobs                   → append a new job, persist locally + upload to GCS
 *   GET  /api/candidates             → return candidates_final.json (from GCS if available, else local)
 *   PATCH /api/candidates/:id        → update a single candidate field (e.g. jobApplicationStatus)
 *   GET  /healthz                    → health check for Cloud Run
 *
 * In production (Cloud Run) Node also serves the pre-built React SPA from /dist.
 *
 * Env vars — set in api/.env for local dev, or in Cloud Run service:
 *   PORT                  default 3001  (Cloud Run injects 8080)
 *   GCS_BUCKET            GCS bucket name, e.g. ava-storage-bucket
 *   GCS_JOBS_OBJECT       object path inside bucket, default data/jobs.json
 *   GCS_CANDIDATES_OBJECT object path for candidates, default candidates/candidates_final.json
 *   NODE_ENV              production | development
 */

// ── Load .env from api/ directory (local dev only; no-op if file absent) ─────
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express   = require('express')
const cors      = require('cors')
const fs        = require('fs')
const path      = require('path')
const { randomUUID } = require('crypto')

const app  = express()
const PORT = process.env.PORT || 3001

// ── Data store paths ──────────────────────────────────────────────────────────
// Both files live under /app/data/ in the container (see Dockerfile COPY steps).
// In local dev __dirname = .../ava-recruiter/api, so ../data resolves correctly.
const DATA_DIR       = path.resolve(__dirname, '..', 'data')
const JOBS_FILE      = path.join(DATA_DIR, 'jobs.json')
const CANDS_FILE     = path.join(DATA_DIR, 'candidates_final.json')

// ── GCS setup (active when GCS_BUCKET env var is set) ────────────────────────
const GCS_BUCKET      = (process.env.GCS_BUCKET || '').trim()
const GCS_OBJECT      = (process.env.GCS_JOBS_OBJECT || 'data/jobs.json').trim()
const GCS_CANDS_OBJ   = (process.env.GCS_CANDIDATES_OBJECT || 'candidates/candidates_final.json').trim()
let gcsBucket         = null

if (GCS_BUCKET) {
  try {
    const { Storage } = require('@google-cloud/storage')
    gcsBucket = new Storage().bucket(GCS_BUCKET)
    console.log(`[gcs] configured → gs://${GCS_BUCKET}/${GCS_OBJECT}`)
  } catch (err) {
    console.warn('[gcs] @google-cloud/storage load failed — GCS disabled:', err.message)
  }
} else {
  console.warn('[gcs] GCS_BUCKET env var not set — GCS persistence disabled.')
  console.warn('[gcs] Set GCS_BUCKET=ava-storage-bucket in api/.env for local dev.')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Jobs (disk-based — jobs.json is in a writable ephemeral layer via COPY) ───
function readJobs() {
  try { return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')) } catch { return [] }
}

function writeJobs(jobs) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2))
  console.log(`[jobs] wrote ${jobs.length} jobs to ${JOBS_FILE}`)
}

async function uploadToGcs(jobs) {
  if (!gcsBucket) return
  try {
    await gcsBucket.file(GCS_OBJECT).save(JSON.stringify(jobs, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    })
    console.log(`[gcs] ✓ uploaded ${jobs.length} jobs → gs://${GCS_BUCKET}/${GCS_OBJECT}`)
  } catch (err) {
    console.error(`[gcs] ✗ jobs upload failed: ${err.message}`)
    if (err.code) console.error(`[gcs]   HTTP code: ${err.code}`)
  }
}

// ── Candidates (GCS-first — read/write directly to GCS; fall back to disk) ────
// Cloud Run has a read-only container filesystem for image layers.
// We never try to write candidates back to the container disk.
// In local dev (no GCS_BUCKET), we fall back to the local file.

async function readCandidatesFromGcs() {
  if (!gcsBucket) return null
  try {
    const file = gcsBucket.file(GCS_CANDS_OBJ)
    const [exists] = await file.exists()
    if (!exists) {
      console.log('[gcs] candidates file not found in bucket — using local seed')
      return null
    }
    const [content] = await file.download()
    console.log(`[gcs] ✓ read candidates from gs://${GCS_BUCKET}/${GCS_CANDS_OBJ}`)
    return JSON.parse(content.toString('utf8'))
  } catch (err) {
    console.error(`[gcs] candidates read failed: ${err.message}`)
    return null
  }
}

function readCandidatesFromDisk() {
  try { return JSON.parse(fs.readFileSync(CANDS_FILE, 'utf8')) } catch { return { candidates: [] } }
}

async function getCandidates() {
  const gcsData = await readCandidatesFromGcs()
  return gcsData ?? readCandidatesFromDisk()
}

async function saveCandidatesToGcs(data) {
  if (!gcsBucket) {
    // Local dev — write to disk instead
    try {
      fs.writeFileSync(CANDS_FILE, JSON.stringify(data, null, 2))
      console.log(`[candidates] wrote to disk (local dev): ${CANDS_FILE}`)
    } catch (err) {
      console.error(`[candidates] disk write failed: ${err.message}`)
    }
    return
  }
  try {
    await gcsBucket.file(GCS_CANDS_OBJ).save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    })
    console.log(`[gcs] ✓ saved candidates → gs://${GCS_BUCKET}/${GCS_CANDS_OBJ}`)
  } catch (err) {
    console.error(`[gcs] ✗ candidates save failed: ${err.message}`)
  }
}

/**
 * Cold-start restore — only needed for jobs (disk-based).
 * Candidates are read live from GCS on every request — no restore needed.
 */
async function restoreFromGcs() {
  if (!gcsBucket) return
  try {
    const jobsFile = gcsBucket.file(GCS_OBJECT)
    const [jobsExist] = await jobsFile.exists()
    if (jobsExist) {
      const [content] = await jobsFile.download()
      writeJobs(JSON.parse(content.toString('utf8')))
      console.log(`[gcs] ✓ restored jobs from gs://${GCS_BUCKET}/${GCS_OBJECT}`)
    } else {
      console.log('[gcs] no jobs file in bucket yet — using local seed')
    }
  } catch (err) {
    console.error(`[gcs] jobs restore failed (using local seed): ${err.message}`)
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }))

// GET /api/jobs
app.get('/api/jobs', (_req, res) => res.json(readJobs()))

// GET /api/candidates
// Reads LIVE from GCS on every request (no disk cache).
// In local dev (no GCS_BUCKET) falls back to src/data/candidates_final.json.
// Edit gs://ava-storage-bucket/candidates/candidates_final.json → reflects immediately.
app.get('/api/candidates', async (_req, res) => {
  try {
    const data = await getCandidates()
    res.json(data)
  } catch (err) {
    console.error('[candidates] GET failed:', err.message)
    res.status(500).json({ error: 'failed to load candidates' })
  }
})

// PATCH /api/candidates/:id  — update a single candidate field at runtime
// Body: { "jobApplicationStatus": "accepted" }  (any top-level field)
// Reads from GCS, merges, writes back to GCS.
app.patch('/api/candidates/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'body must be a JSON object of fields to update' })
  }

  try {
    const data = await getCandidates()
    const idx  = (data.candidates || []).findIndex(c => c.id === id)
    if (idx === -1) return res.status(404).json({ error: `candidate id "${id}" not found` })

    data.candidates[idx] = { ...data.candidates[idx], ...updates }
    await saveCandidatesToGcs(data)

    console.log(`[candidates] patched ${id}:`, updates)
    res.json(data.candidates[idx])
  } catch (err) {
    console.error('[candidates] PATCH failed:', err.message)
    res.status(500).json({ error: 'failed to update candidate' })
  }
})

// POST /api/jobs
app.post('/api/jobs', async (req, res) => {
  const body = req.body
  if (!body || !body.title) {
    return res.status(400).json({ error: 'title is required' })
  }

  const newJob = {
    id:           body.id           || randomUUID(),
    title:        body.title,
    dept:         body.dept         || body.department || '',
    location:     body.location     || '',
    type:         body.type         || 'Full-time',
    seniority:    body.seniority    || 'Mid',
    urgency:      body.urgency      || 'Medium',
    salary:       body.salary       || '',
    description:  body.description  || '',
    requirements: body.requirements || '',
    niceToHave:   body.niceToHave   || '',
    closingDate:  body.closingDate  || '',
    applicants:   0,
    matched:      0,
    postedAt:     new Date().toISOString(),
  }

  const jobs = readJobs()
  jobs.unshift(newJob)   // newest first
  writeJobs(jobs)
  await uploadToGcs(jobs)

  console.log(`[jobs] posted: "${newJob.title}" (id=${newJob.id})`)
  res.status(201).json(newJob)
})

// ── Serve React SPA in production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const DIST = path.resolve(__dirname, '..', 'dist')
  app.use(express.static(DIST))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' })
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

// ── Start (restore from GCS first, then listen) ───────────────────────────────
restoreFromGcs().then(() => {
  app.listen(PORT, () => {
    console.log(`\n[ava-api] ✓ listening on http://0.0.0.0:${PORT}`)
    console.log(`[ava-api]   NODE_ENV  = ${process.env.NODE_ENV || 'development'}`)
    console.log(`[ava-api]   GCS_BUCKET= ${GCS_BUCKET || '(not set)'}`)
    console.log(`[ava-api]   jobs file = ${JOBS_FILE}\n`)
  })
})
