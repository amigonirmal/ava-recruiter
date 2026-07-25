// Jobs API service — wraps the Express backend at /api/jobs
// In dev (Vite proxy) and in production (Node serves both), base URL is relative.

const BASE = '/api/jobs'

/**
 * Fetch all jobs.
 * @returns {Promise<Array>}
 */
export async function fetchJobs() {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`fetchJobs failed: ${res.status}`)
  return res.json()
}

/**
 * Post a new job.
 * @param {Object} job
 * @returns {Promise<Object>} the saved job (with server-assigned id + postedAt)
 */
export async function postJob(job) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  })
  if (!res.ok) throw new Error(`postJob failed: ${res.status}`)
  return res.json()
}
