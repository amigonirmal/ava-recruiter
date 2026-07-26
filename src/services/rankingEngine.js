/**
 * AVA Recruiter — Candidate Ranking Engine
 * =========================================
 * Pure, side-effect-free scoring/ranking module.
 * Designed for O(N) per-candidate scoring → O(N log N) sort.
 * Safe to run client-side on every slider change (< 1ms for ≤ 1000 candidates).
 *
 * Scale contract
 * ──────────────
 * JD weights  : slider values 0–10  (or any positive number — normalized internally)
 * Candidate   : scores per criterion 0–10  (maxScore = 10 per candidates_final.json)
 * Output      : match_percentage 0–100
 *
 * Missing-score handling
 * ──────────────────────
 * DEFAULT (mode = "exclude"): if a candidate is missing a score for a criterion,
 *   that criterion is excluded from the weighted sum AND the JD weights for the
 *   remaining criteria are re-normalized so they still sum to 1.0 for that candidate.
 *
 * ALTERNATE (mode = "zero"): treat missing as 0, flag candidate as "partial".
 *
 * Edge cases
 * ──────────
 * All sliders zero  → fall back to equal weighting (1/N per criterion).
 * Candidate has no scores at all → match_percentage = 0, rank = last, data_completeness = "no data".
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

/** The 5 scoring criteria keys — must match candidates_final.json scores object */
export const CRITERIA_KEYS = ['pipeline', 'scalability', 'gov', 'sovereignty', 'privacy']

/** Human-readable labels for each criterion key */
export const CRITERIA_LABELS = {
  pipeline:    'Pipeline Architecture',
  scalability: 'Scalability',
  gov:         'Data Governance',
  sovereignty: 'Data Sovereignty',
  privacy:     'Privacy Engineering',
}

/** Score scale — candidate scores are out of this value */
const SCORE_MAX = 10

// ─── Weight normalisation ──────────────────────────────────────────────────────

/**
 * Given a raw weight object { pipeline: 9, scalability: 6, … } (any positive scale),
 * return normalised weights that sum to 1.0.
 * If all weights are zero (or no keys), returns equal weighting across all criteria.
 *
 * @param {Record<string, number>} rawWeights
 * @param {string[]} [keys=CRITERIA_KEYS]  — subset of criteria to normalise over
 * @returns {Record<string, number>}  normalised weights summing to 1.0
 */
export function normaliseWeights(rawWeights, keys = CRITERIA_KEYS) {
  const total = keys.reduce((sum, k) => sum + (rawWeights[k] ?? 0), 0)

  if (total === 0) {
    // All-zero / untouched → equal weighting
    const eq = 1 / keys.length
    return Object.fromEntries(keys.map(k => [k, eq]))
  }

  return Object.fromEntries(keys.map(k => [k, (rawWeights[k] ?? 0) / total]))
}

// ─── Single-candidate scorer ───────────────────────────────────────────────────

/**
 * Score one candidate against normalised JD weights.
 *
 * @param {object} candidate   — from candidates_final.json  (must have .scores, .id, .name)
 * @param {Record<string, number>} normWeights — already normalised (sum = 1.0)
 * @param {'exclude'|'zero'} missingMode
 * @returns {{
 *   match_percentage: number,
 *   breakdown: Array,
 *   data_completeness: string,
 * }}
 */
function scoreOne(candidate, normWeights, missingMode = 'exclude') {
  const rawScores  = candidate.scores ?? {}
  const presentKeys = CRITERIA_KEYS.filter(k => rawScores[k] != null)
  const missingKeys = CRITERIA_KEYS.filter(k => rawScores[k] == null)

  let breakdown    = []
  let matchPct     = 0
  let completeness = 'complete'

  if (presentKeys.length === 0) {
    // No scores at all
    breakdown = CRITERIA_KEYS.map(k => ({
      parameter:       CRITERIA_LABELS[k],
      jd_weight_pct:   +(normWeights[k] * 100).toFixed(1),
      candidate_score: null,
      contribution_pct: 0,
    }))
    return { match_percentage: 0, breakdown, data_completeness: 'no data' }
  }

  // Compute effective weights for this candidate
  let effectiveWeights
  if (missingMode === 'exclude' && missingKeys.length > 0) {
    effectiveWeights = normaliseWeights(normWeights, presentKeys)
    completeness = `partial: missing ${missingKeys.map(k => CRITERIA_LABELS[k]).join(', ')}`
  } else {
    effectiveWeights = normWeights
    if (missingKeys.length > 0) {
      completeness = `partial: missing ${missingKeys.map(k => CRITERIA_LABELS[k]).join(', ')}`
    }
  }

  // Weighted sum
  for (const k of CRITERIA_KEYS) {
    const rawScore  = rawScores[k] ?? null
    const jdWeight  = normWeights[k]            // always report the JD weight as-posted
    const effWeight = effectiveWeights[k] ?? 0  // effective weight for this candidate

    const candidateScorePct = rawScore != null ? (rawScore / SCORE_MAX) * 100 : null
    const contribution      = (missingMode === 'exclude' && rawScore == null)
      ? 0
      : ((candidateScorePct ?? 0) * effWeight)

    matchPct += contribution

    breakdown.push({
      parameter:        CRITERIA_LABELS[k],
      jd_weight_pct:    +(jdWeight * 100).toFixed(1),
      candidate_score:  rawScore,            // raw 0–10
      candidate_score_pct: candidateScorePct != null ? +candidateScorePct.toFixed(1) : null,
      effective_weight_pct: +(effWeight * 100).toFixed(1),
      contribution_pct: +contribution.toFixed(2),
    })
  }

  return {
    match_percentage: +matchPct.toFixed(1),
    breakdown,
    data_completeness: completeness,
  }
}

// ─── Tie-aware rank assignment ─────────────────────────────────────────────────

/**
 * Standard competition ranking (1224, not 1223).
 * Input array must already be sorted descending by match_percentage.
 * Mutates each element: adds .rank property.
 */
function assignRanks(sorted) {
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].match_percentage < sorted[i - 1].match_percentage) {
      rank = i + 1   // gap in ranking for ties
    }
    sorted[i].rank = rank
  }
  return sorted
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Rank all candidates against a JD.
 *
 * @param {object} opts
 * @param {string}               opts.jobId         — job identifier string
 * @param {Record<string,number>} opts.jdWeights    — raw slider values { pipeline:9, … }
 * @param {Array}                opts.candidates    — from /api/candidates response
 * @param {'exclude'|'zero'}     [opts.missingMode='exclude']
 *
 * @returns {{
 *   job_id: string,
 *   weights_used: Record<string, number>,  // normalised
 *   ranked_candidates: Array,
 * }}
 */
export function rankCandidates({ jobId = 'unknown', jdWeights, candidates, missingMode = 'exclude' }) {
  // 1. Normalise weights once — O(K) where K = 5 criteria (constant)
  const normWeights = normaliseWeights(jdWeights)

  // 2. Score every candidate — O(N × K)
  const scored = candidates.map(c => {
    const { match_percentage, breakdown, data_completeness } = scoreOne(c, normWeights, missingMode)
    return {
      candidate_id:     c.id,
      name:             c.name,
      initials:         c.initials,
      jobApplicationStatus: c.jobApplicationStatus,
      match_percentage,
      breakdown,
      data_completeness,
      // Pass through the full candidate object for UI convenience
      _candidate:       c,
    }
  })

  // 3. Sort descending — O(N log N)
  scored.sort((a, b) => b.match_percentage - a.match_percentage)

  // 4. Assign ranks with tie logic — O(N)
  assignRanks(scored)

  return {
    job_id:           jobId,
    weights_used:     normWeights,
    ranked_candidates: scored,
  }
}
