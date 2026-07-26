// API service layer — wraps the Express backend
// In dev (Vite proxy) and in production (Node serves both), base URL is relative.

const JOBS_BASE  = '/api/jobs'
const CANDS_BASE = '/api/candidates'

/**
 * Fetch all jobs.
 * @returns {Promise<Array>}
 */
export async function fetchJobs() {
  const res = await fetch(JOBS_BASE)
  if (!res.ok) throw new Error(`fetchJobs failed: ${res.status}`)
  return res.json()
}

/**
 * Post a new job.
 * @param {Object} job
 * @returns {Promise<Object>} the saved job (with server-assigned id + postedAt)
 */
export async function postJob(job) {
  const res = await fetch(JOBS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  })
  if (!res.ok) throw new Error(`postJob failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch the full candidates payload from the API.
 * The API always reads from disk (restored from GCS on container start),
 * so edits made to candidates_final.json in GCS and a container restart
 * will be reflected here without a new front-end build.
 * @returns {Promise<Object>}  { meta, scoreCriteria, candidates, … }
 */
export async function fetchCandidates() {
  const res = await fetch(CANDS_BASE)
  if (!res.ok) throw new Error(`fetchCandidates failed: ${res.status}`)
  return res.json()
}

/**
 * Patch a single candidate's fields (e.g. jobApplicationStatus).
 * @param {string} id       candidate id
 * @param {Object} updates  { jobApplicationStatus: 'accepted' }
 * @returns {Promise<Object>} updated candidate
 */
export async function patchCandidate(id, updates) {
  const res = await fetch(`${CANDS_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(`patchCandidate failed: ${res.status}`)
  return res.json()
}
