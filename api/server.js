/**
 * AVA Recruiter — API Server
 *
 * Routes:
 *   GET  /api/jobs                   → return all jobs (live from GCS, fallback disk)
 *   POST /api/jobs                   → append a new job, persist to GCS jobs.json
 *                                      + inject new job_search entry (status:"") into every
 *                                        candidate profile in GCS bucket/profiles/
 *   PATCH /api/jobs/:id              → update a single job field (e.g. status:'closed')
 *                                      + inject job_search entry into profiles if not present
 *   GET  /api/candidates             → return candidates_final.json (from GCS if available, else local)
 *   PATCH /api/candidates/:id        → update a single candidate field (e.g. jobApplicationStatus)
 *   GET  /healthz                    → health check for Cloud Run
 *
 * In production (Cloud Run) Node also serves the pre-built React SPA from /dist.
 *
 * Env vars — set in api/.env for local dev, or in Cloud Run service:
 *   PORT                    default 3001  (Cloud Run injects 8080)
 *   GCS_BUCKET              GCS bucket name, e.g. ava-storage-bucket
 *   GCS_JOBS_OBJECT         object path inside bucket, default data/jobs.json
 *   GCS_CANDIDATES_OBJECT   object path for candidates, default candidates/candidates_final.json
 *   GCS_PROFILES_PREFIX     folder prefix for candidate profiles, default profiles
 *   NODE_ENV                production | development
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
const CANDS_DIR      = path.join(DATA_DIR, 'candidates')

// ── GCS setup (active when GCS_BUCKET env var is set) ────────────────────────
const GCS_BUCKET          = (process.env.GCS_BUCKET || '').trim()
const GCS_OBJECT          = (process.env.GCS_JOBS_OBJECT || 'data/jobs.json').trim()
const GCS_CANDS_OBJ       = (process.env.GCS_CANDIDATES_OBJECT || 'candidates/candidates_final.json').trim()
const GCS_PROFILES_PREFIX = (process.env.GCS_PROFILES_PREFIX || 'profiles').trim()
let gcsBucket             = null

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

function getCandidatesObjectPath(jobId) {
  return jobId ? `candidates/${jobId}.json` : GCS_CANDS_OBJ
}

function getCandidatesDiskPath(jobId) {
  return jobId ? path.join(CANDS_DIR, `${jobId}.json`) : CANDS_FILE
}

async function readCandidatesFromGcs(jobId) {
  if (!gcsBucket) return null
  const objectPath = getCandidatesObjectPath(jobId)
  try {
    const file = gcsBucket.file(objectPath)
    const [exists] = await file.exists()
    if (!exists) {
      console.log(`[gcs] candidates file not found at ${objectPath} — using local seed`)
      return null
    }
    const [content] = await file.download()
    console.log(`[gcs] ✓ read candidates from gs://${GCS_BUCKET}/${objectPath}`)
    return JSON.parse(content.toString('utf8'))
  } catch (err) {
    console.error(`[gcs] candidates read failed: ${err.message}`)
    return null
  }
}

function readCandidatesFromDisk(jobId) {
  try {
    return JSON.parse(fs.readFileSync(getCandidatesDiskPath(jobId), 'utf8'))
  } catch {
    return { candidates: [] }
  }
}

async function getCandidates(jobId) {
  const gcsData = await readCandidatesFromGcs(jobId)
  return gcsData ?? readCandidatesFromDisk(jobId)
}

async function saveCandidates(data, jobId) {
  const filePath = getCandidatesDiskPath(jobId)
  const objectPath = getCandidatesObjectPath(jobId)

  if (!gcsBucket) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`[candidates] wrote to disk: ${filePath}`)
    } catch (err) {
      console.error(`[candidates] disk write failed: ${err.message}`)
    }
    return
  }
  try {
    await gcsBucket.file(objectPath).save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    })
    console.log(`[gcs] ✓ saved candidates → gs://${GCS_BUCKET}/${objectPath}`)
  } catch (err) {
    console.error(`[gcs] ✗ candidates save failed: ${err.message}`)
  }
}

async function createJobCandidatesFile(job) {
  const seed = await getCandidates()
  const jobCandidates = {
    ...seed,
    jobId: job.id,
    jobTitle: job.title,
    location: job.location || '',
    salary: job.salary || '',
    skills: Array.isArray(job.skills) ? job.skills : [],
    candidates: (seed.candidates || []).map(candidate => ({
      ...candidate,
      jobApplicationStatus: 'pending',
      jobTitle: job.title,
      location: job.location || '',
      compensationRange: job.salary || '',
      skills: Array.isArray(job.skills) ? job.skills : [],
    })),
  }
  await saveCandidates(jobCandidates, job.id)
}

// ── Candidate Profiles (GCS — profiles/ca0001.json … ca000N.json) ────────────
// Lists all objects under GCS_PROFILES_PREFIX, reads each, patches job_search,
// and writes back. Only runs when gcsBucket is configured.

/**
 * Return all profile object names under the profiles prefix.
 * @returns {Promise<string[]>}  e.g. ['profiles/ca0001.json', 'profiles/ca0002.json']
 */
async function listProfileObjects() {
  if (!gcsBucket) return []
  try {
    const [files] = await gcsBucket.getFiles({ prefix: GCS_PROFILES_PREFIX + '/' })
    return files
      .map(f => f.name)
      .filter(n => n.endsWith('.json'))
  } catch (err) {
    console.error(`[profiles] listProfileObjects failed: ${err.message}`)
    return []
  }
}

/**
 * Read a single profile JSON from GCS.
 * @param {string} objectName
 * @returns {Promise<Object|null>}
 */
async function readProfileFromGcs(objectName) {
  try {
    const [content] = await gcsBucket.file(objectName).download()
    return JSON.parse(content.toString('utf8'))
  } catch (err) {
    console.error(`[profiles] read "${objectName}" failed: ${err.message}`)
    return null
  }
}

/**
 * Write a single profile JSON back to GCS.
 * @param {string} objectName
 * @param {Object} data
 */
async function writeProfileToGcs(objectName, data) {
  try {
    await gcsBucket.file(objectName).save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    })
    console.log(`[profiles] ✓ updated ${objectName}`)
  } catch (err) {
    console.error(`[profiles] write "${objectName}" failed: ${err.message}`)
  }
}

/**
 * Inject a new job_search entry (status: "") into every candidate profile in GCS.
 * If the job_id already exists in a profile's job_search array, that entry is skipped
 * so we never duplicate or overwrite an existing status.
 *
 * @param {Object} job  — the full job object (id, title, location, salary, postedAt …)
 */
async function injectJobIntoProfiles(job) {
  if (!gcsBucket) {
    console.warn('[profiles] GCS not configured — skipping profile injection')
    return
  }

  const objectNames = await listProfileObjects()
  if (objectNames.length === 0) {
    console.warn(`[profiles] no profiles found under gs://${GCS_BUCKET}/${GCS_PROFILES_PREFIX}/`)
    return
  }

  const entry = {
    job_id:             job.id    || '',
    title:              job.title || '',
    company:            'Ava',
    location:           job.location || '',
    compensation_range: job.salary   || '',
    skills:             Array.isArray(job.skills) ? job.skills : [],
    posted_date:        job.postedAt
                          ? new Date(job.postedAt).toISOString().slice(0, 10)
                          : new Date().toISOString().slice(0, 10),
    status:             '',          // intentionally blank — set by recruiter later
    decision_reason:    '',
  }

  console.log(`[profiles] injecting job "${job.id}" into ${objectNames.length} profiles…`)

  await Promise.all(objectNames.map(async (name) => {
    const profile = await readProfileFromGcs(name)
    if (!profile) return

    // Ensure job_search array exists
    if (!Array.isArray(profile.job_search)) profile.job_search = []

    // Skip if this job_id is already present
    const alreadyPresent = profile.job_search.some(e => e.job_id === entry.job_id)
    if (alreadyPresent) {
      console.log(`[profiles] skipped ${name} — job_id "${entry.job_id}" already present`)
      return
    }

    // Prepend so newest job is first
    profile.job_search = [entry, ...profile.job_search]
    await writeProfileToGcs(name, profile)
  }))

  console.log(`[profiles] ✓ injection complete for job "${job.id}"`)
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

// GET /api/jobs — reads live from GCS on every request (like candidates).
// Falls back to local disk when GCS is unavailable.
app.get('/api/jobs', async (_req, res) => {
  if (gcsBucket) {
    try {
      const file = gcsBucket.file(GCS_OBJECT)
      const [exists] = await file.exists()
      if (exists) {
        const [content] = await file.download()
        const jobs = JSON.parse(content.toString('utf8'))
        // Keep local copy in sync so POST/PATCH still work correctly
        writeJobs(jobs)
        return res.json(jobs)
      }
    } catch (err) {
      console.warn(`[gcs] jobs live-read failed, falling back to disk: ${err.message}`)
    }
  }
  res.json(readJobs())
})

// GET /api/profiles/:id — read a single candidate profile JSON from GCS
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'invalid profile id' })
  }
  const objectName = `${GCS_PROFILES_PREFIX}/${id}.json`
  if (!gcsBucket) {
    // Local dev fallback — look for profiles/ folder at repo root
    const localPath = path.resolve(__dirname, '..', '..', 'profiles', `${id}.json`)
    if (fs.existsSync(localPath)) {
      try { return res.json(JSON.parse(fs.readFileSync(localPath, 'utf8'))) }
      catch { return res.status(500).json({ error: 'failed to read local profile' }) }
    }
    return res.status(404).json({ error: `profile "${id}" not found` })
  }
  const profile = await readProfileFromGcs(objectName)
  if (!profile) return res.status(404).json({ error: `profile "${id}" not found in GCS` })
  res.json(profile)
})

// GET /api/photos/:id — redirect to a short-lived signed URL for profilePhotos/<id>.jpg in GCS.
// Falls back to 404 JSON when GCS is not configured (local dev).
app.get('/api/photos/:id', async (req, res) => {
  const { id } = req.params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'invalid photo id' })
  }
  if (!gcsBucket) {
    return res.status(404).json({ error: 'GCS not configured' })
  }
  try {
    const objectName = `profilePhotos/${id}.jpg`
    const file = gcsBucket.file(objectName)
    const [exists] = await file.exists()
    if (!exists) return res.status(404).json({ error: `photo "${id}" not found` })
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    })
    res.redirect(302, url)
  } catch (err) {
    console.error(`[photos] signed-url for "${id}" failed: ${err.message}`)
    res.status(500).json({ error: 'failed to generate photo url' })
  }
})

// PATCH /api/profiles/:id/job-search/:jobId — update a candidate's job_search entry
// Body: { "status": "Accepted", "decision_reason": "..." }
app.patch('/api/profiles/:id/job-search/:jobId', async (req, res) => {
  const { id, jobId } = req.params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'invalid profile id' })
  }
  const { status, decision_reason } = req.body || {}
  if (!status) return res.status(400).json({ error: 'status is required' })

  const objectName = `${GCS_PROFILES_PREFIX}/${id}.json`

  if (!gcsBucket) {
    const localPath = path.resolve(__dirname, '..', '..', 'profiles', `${id}.json`)
    if (!fs.existsSync(localPath)) return res.status(404).json({ error: `profile "${id}" not found` })
    try {
      const profile = JSON.parse(fs.readFileSync(localPath, 'utf8'))
      const entry = (profile.job_search || []).find(e => e.job_id === jobId)
      if (!entry) return res.status(404).json({ error: `job_id "${jobId}" not found in profile` })
      entry.status = status
      if (decision_reason !== undefined) entry.decision_reason = decision_reason
      fs.writeFileSync(localPath, JSON.stringify(profile, null, 2))
      return res.json(entry)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  const profile = await readProfileFromGcs(objectName)
  if (!profile) return res.status(404).json({ error: `profile "${id}" not found in GCS` })

  const entry = (profile.job_search || []).find(e => e.job_id === jobId)
  if (!entry) return res.status(404).json({ error: `job_id "${jobId}" not found in profile` })

  entry.status = status
  if (decision_reason !== undefined) entry.decision_reason = decision_reason
  await writeProfileToGcs(objectName, profile)

  console.log(`[profiles] patched ${id} → job_search[${jobId}].status = "${status}"`)
  res.json(entry)
})

// GET /api/candidates
// Reads LIVE from GCS on every request (no disk cache).
// In local dev (no GCS_BUCKET) falls back to src/data/candidates_final.json.
// Edit gs://ava-storage-bucket/candidates/candidates_final.json → reflects immediately.
app.get('/api/candidates', async (req, res) => {
  try {
    const data = await getCandidates(req.query.jobId)
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
  const jobId = req.query.jobId
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'body must be a JSON object of fields to update' })
  }

  try {
    const data = await getCandidates(jobId)
    const idx  = (data.candidates || []).findIndex(c => c.id === id)
    if (idx === -1) return res.status(404).json({ error: `candidate id "${id}" not found` })

    data.candidates[idx] = { ...data.candidates[idx], ...updates }
    await saveCandidates(data, jobId)

    console.log(`[candidates] patched ${id}:`, updates)
    res.json(data.candidates[idx])
  } catch (err) {
    console.error('[candidates] PATCH failed:', err.message)
    res.status(500).json({ error: 'failed to update candidate' })
  }
})

// PATCH /api/jobs/:id  — update a single job (e.g. status:'closed')
app.patch('/api/jobs/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'body must be a JSON object' })
  }
  const jobs = readJobs()
  const idx  = jobs.findIndex(j => j.id === id)
  if (idx === -1) return res.status(404).json({ error: `job id "${id}" not found` })

  jobs[idx] = { ...jobs[idx], ...updates }
  writeJobs(jobs)
  await uploadToGcs(jobs)

  // If this patch carries job metadata changes (not just status:'closed'),
  // ensure every profile has a job_search entry for this job (no-op if already present)
  if (!updates.status || updates.status !== 'closed') {
    injectJobIntoProfiles(jobs[idx]).catch(err =>
      console.error('[profiles] injectJobIntoProfiles (patch) error:', err.message)
    )
  }

  console.log(`[jobs] patched ${id}:`, updates)
  res.json(jobs[idx])
})

// POST /api/jobs
app.post('/api/jobs', async (req, res) => {
  const body = req.body
  if (!body || !body.title) {
    return res.status(400).json({ error: 'title is required' })
  }

  const newJob = {
    id:                 body.id           || randomUUID(),
    title:              body.title,
    dept:               body.dept         || body.department || '',
    location:           body.location     || '',
    type:               body.type         || 'Full-time',
    seniority:          body.seniority    || 'Mid',
    urgency:            body.urgency      || 'Medium',
    salary:             body.salary       || '',
    skills:             Array.isArray(body.skills) ? body.skills : [],
    description:        body.description  || '',
    requirements:       body.requirements || '',
    niceToHave:         body.niceToHave   || '',
    closingDate:        body.closingDate  || '',
    // Extended HCMT fields — populated when job is posted via the visual HCMT flow
    jobRef:             body.jobRef       || '',
    reportsTo:          body.reportsTo    || '',
    proofOfWork:        body.proofOfWork  || '',
    compensation:       body.compensation || '',
    competencyWeights:  body.competencyWeights || null,
    applicants:         0,
    matched:            0,
    postedAt:           new Date().toISOString(),
  }

  const jobs = readJobs()
  jobs.unshift(newJob)   // newest first
  writeJobs(jobs)
  await uploadToGcs(jobs)

  await createJobCandidatesFile(newJob)

  // Inject new job_search entry into every candidate profile in GCS (fire-and-forget)
  injectJobIntoProfiles(newJob).catch(err =>
    console.error('[profiles] injectJobIntoProfiles error:', err.message)
  )

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
