import { useState, useEffect, useRef, useCallback } from 'react'
import './LandingPage.css'
import { fetchJobs, postJob } from '../services/jobsApi'
import CANDIDATES_DATA from '../data/candidates_final.json'

// ─── SVG nav icons ──────────────────────────────────────────────────────────
const Icon = ({ d, vb = '0 0 24 24', size = 16 }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const Icons = {
  dashboard:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  candidates: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  jobs:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  analytics:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  settings:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const StatCard = ({ label, value, delta, accent }) => (
  <div className="rl-stat-card">
    <div className="rl-stat-label">{label}</div>
    <div className="rl-stat-value" style={{ color: accent || 'var(--color-teal)' }}>{value}</div>
    {delta && <div className="rl-stat-delta">{delta}</div>}
  </div>
)

const CandidateRow = ({ name, role, score, status, rating }) => {
  const statusColor = { Active:'rgba(0,230,210,0.8)', Interviewing:'#F59E0B', Shortlisted:'#22C55E', New:'rgba(0,230,210,0.5)' }[status] || 'var(--color-text-muted)'
  return (
    <div className="rl-candidate-row">
      <div className="rl-candidate-avatar">{name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
      <div className="rl-candidate-info">
        <div className="rl-candidate-name">{name}</div>
        <div className="rl-candidate-role">{role}</div>
      </div>
      <div className="rl-candidate-score"><div className="rl-score-num">{score}</div><div className="rl-score-label">SCORE</div></div>
      <div className="rl-candidate-rating">{rating}</div>
      <div className="rl-candidate-status" style={{ color: statusColor }}>
        <span className="rl-status-dot" style={{ background: statusColor }} />{status}
      </div>
      <button className="rl-view-btn">VIEW PROFILE</button>
    </div>
  )
}

const JobCard = ({ title, dept, applicants, matched, urgency, onReviewMatches }) => {
  const urgencyColor = { High:'#FF3B4E', Medium:'#F59E0B', Low:'#22C55E' }[urgency]
  return (
    <div className="rl-job-card">
      <div className="rl-job-header">
        <div><div className="rl-job-title">{title}</div><div className="rl-job-dept">{dept}</div></div>
        <span className="rl-urgency-badge" style={{ color: urgencyColor, borderColor: urgencyColor }}>{urgency}</span>
      </div>
      <div className="rl-job-stats">
        <div className="rl-job-stat"><span>{applicants}</span><label>Applicants</label></div>
        <div className="rl-job-stat"><span style={{ color:'var(--color-teal)' }}>{matched}</span><label>AI Matched</label></div>
      </div>
      <button className="rl-job-btn" onClick={onReviewMatches}>REVIEW MATCHES</button>
    </div>
  )
}

// ─── Matching Matrix View ─────────────────────────────────────────────────────
const MatchingMatrixView = ({ job, onBack, onClose }) => {
  const candidates   = CANDIDATES_DATA.candidates
  const scoreCriteria = CANDIDATES_DATA.scoreCriteria
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [filter, setFilter]                       = useState('ALL')
  const [showCloseConfirm, setShowCloseConfirm]   = useState(false)

  const acceptedCount = candidates.filter(c => c.jobApplicationStatus === 'accepted').length
  const filtered = filter === 'ALL' ? candidates : candidates.filter(c => c.jobApplicationStatus === filter)
  const sorted = [...filtered].sort((a, b) => {
    if (a.jobApplicationStatus === 'accepted' && b.jobApplicationStatus !== 'accepted') return -1
    if (b.jobApplicationStatus === 'accepted' && a.jobApplicationStatus !== 'accepted') return 1
    return b.overallScore - a.overallScore
  })

  const REC_COLOR = { green: '#22C55E', amber: '#F59E0B', red: '#FF3B4E' }
  const recColor = c => REC_COLOR[c.recommendationColor] || 'var(--color-teal)'
  const rating   = pct => pct >= 90 ? 'AA+' : pct >= 80 ? 'AA' : pct >= 70 ? 'A+' : pct >= 60 ? 'A' : 'B'

  /* ── Mini pentagon radar (enlarged, with axis labels) ── */
  const MiniRadar = ({ candidate, size = 88 }) => {
    const keys = scoreCriteria.map(c => c.key)
    const vals = keys.map(k => (candidate.scores[k] || 0) / 10)
    const n = vals.length, cx = size / 2, cy = size / 2, maxR = size * 0.38
    const pt = (v, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return [cx + maxR * v * Math.cos(a), cy + maxR * v * Math.sin(a)]
    }
    const axisPt = i => { const a = (i/n)*Math.PI*2 - Math.PI/2; return [cx + maxR*Math.cos(a), cy + maxR*Math.sin(a)] }
    const outerPts = vals.map((_,i) => axisPt(i))
    const innerPts = vals.map((_,i) => { const a = (i/n)*Math.PI*2-Math.PI/2; return [cx+maxR*0.5*Math.cos(a), cy+maxR*0.5*Math.sin(a)] })
    const dataPoly = vals.map((v,i) => pt(v,i)).map(p=>p.join(',')).join(' ')
    const outerPoly = outerPts.map(p=>p.join(',')).join(' ')
    const innerPoly = innerPts.map(p=>p.join(',')).join(' ')
    const labels = ['PIPE','SCALE','GOV','SOV','PRIV']
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon points={outerPoly} fill="none" stroke="rgba(0,230,210,0.12)" strokeWidth="0.8"/>
        <polygon points={innerPoly} fill="none" stroke="rgba(0,230,210,0.07)" strokeWidth="0.8"/>
        {outerPts.map((p,i) => <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(0,230,210,0.08)" strokeWidth="0.8"/>)}
        <polygon points={dataPoly} fill="rgba(0,230,210,0.15)" stroke="rgba(0,230,210,0.75)" strokeWidth="1.5"/>
        {vals.map((v,i) => { const [x,y] = pt(v,i); return <circle key={i} cx={x} cy={y} r="2" fill="var(--color-teal)"/> })}
        {labels.map((lbl,i) => {
          const [x,y] = axisPt(i)
          const dx = (x - cx) * 1.32, dy = (y - cy) * 1.32
          return <text key={lbl} x={cx+dx} y={cy+dy+1.5} fontSize="4.8" fill="rgba(0,230,210,0.55)"
            textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-brand)" letterSpacing="0.3">{lbl}</text>
        })}
      </svg>
    )
  }

  /* ── Score ring (SVG arc) for detail panel ── */
  const ScoreRing = ({ pct, color, size = 72 }) => {
    const r = (size - 8) / 2, circ = 2 * Math.PI * r
    const dash = (pct / 100) * circ
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,230,210,0.08)" strokeWidth="6"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round"/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fontSize="13" fontWeight="700" fill={color} fontFamily="var(--font-brand)">{pct}%</text>
      </svg>
    )
  }

  /* ── Score bar row for detail panel ── */
  const ScoreBar = ({ label, score, maxScore }) => {
    const pct = (score / maxScore) * 100
    const col = pct >= 80 ? '#22C55E' : pct >= 60 ? 'var(--color-teal)' : '#F59E0B'
    return (
      <div className="mm-score-row">
        <span className="mm-score-label">{label}</span>
        <div className="mm-score-track">
          <div className="mm-score-fill" style={{ width:`${pct}%`, background: col }}/>
          <div className="mm-score-glow" style={{ left:`${pct}%`, background: col }}/>
        </div>
        <span className="mm-score-val" style={{ color: col }}>{score}<span className="mm-score-max">/{maxScore}</span></span>
      </div>
    )
  }

  /* ── Skill demand bars for volatility panel ── */
  const topSkills = [...new Set(candidates.flatMap(c => c.technicalSkills))].slice(0, 6)
  const skillDemand = { Python:92, SQL:88, Spark:79, Kafka:71, Terraform:65, Airflow:60 }

  return (
    <div className="mm-root">

      {/* ══ BANNER HEADER ══════════════════════════════════════════ */}
      <div className="mm-banner">
        <div className="mm-banner-accent"/>
        <div className="mm-banner-left">
          <button className="mm-back-btn" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            BACK
          </button>
          <div className="mm-banner-titles">
            <div className="mm-banner-eyebrow">
              <span className="mm-live-dot"/>
              ACTIVE REQUISITION · MATCHING MATRIX
            </div>
            <div className="mm-banner-role">{job?.title || 'Senior Data Engineer'}</div>
            <div className="mm-banner-meta">
              {job?.dept && <span className="mm-meta-chip">{job.dept}</span>}
              {job?.location && <span className="mm-meta-chip">{job.location}</span>}
              <span className="mm-meta-chip mm-meta-live">LIVE · AI MATCHING</span>
            </div>
          </div>
        </div>

        <div className="mm-banner-right">
          {/* Acceptance stat */}
          <div className="mm-stat-pill">
            <div className="mm-stat-pill-val">{acceptedCount}</div>
            <div className="mm-stat-pill-lbl">ACCEPTED</div>
          </div>
          <div className="mm-stat-pill">
            <div className="mm-stat-pill-val">{sorted.length}</div>
            <div className="mm-stat-pill-lbl">CANDIDATES</div>
          </div>
          <div className="mm-stat-pill">
            <div className="mm-stat-pill-val mm-stat-pill-val--teal">
              {Math.round(candidates.reduce((s,c)=>s+c.overallScorePercent,0)/candidates.length)}%
            </div>
            <div className="mm-stat-pill-lbl">AVG MATCH</div>
          </div>

          {/* Filter + close */}
          <div className="mm-banner-controls">
            <div className="mm-filter-tabs">
              {['ALL','accepted','not_responded'].map(f => (
                <button key={f} className={`mm-filter-tab${filter===f?' active':''}`} onClick={() => setFilter(f)}>
                  {f === 'ALL' ? 'ALL' : f === 'accepted' ? 'ACCEPTED' : 'PENDING'}
                </button>
              ))}
            </div>
            {!showCloseConfirm ? (
              <button className="mm-close-role-btn" onClick={() => setShowCloseConfirm(true)}>
                ✕ CLOSE ROLE
              </button>
            ) : (
              <div className="mm-close-confirm">
                <span>Close this role?</span>
                <button className="mm-confirm-yes" onClick={() => onClose(job)}>YES, CLOSE</button>
                <button className="mm-confirm-no" onClick={() => setShowCloseConfirm(false)}>CANCEL</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════ */}
      <div className="mm-body">

        {/* ── LEFT: candidate grid + bottom panels ── */}
        <div className="mm-left">
          <div className="mm-section-label">
            THE MATCHING MATRIX
            <span className="mm-section-sub"> · TOP PROFILES · {sorted.length} candidates</span>
          </div>

          {/* ── Candidate cards ── */}
          <div className="mm-grid">
            {sorted.map((c, idx) => {
              const isAccepted = c.jobApplicationStatus === 'accepted'
              const isPending  = c.jobApplicationStatus === 'not_responded'
              const isSelected = selectedCandidate?.id === c.id
              const rc = recColor(c)
              return (
                <div
                  key={c.id}
                  className={`mm-card${isAccepted?' mm-card--accepted':''}${isPending?' mm-card--pending':''}${isSelected?' mm-card--selected':''}`}
                  onClick={() => setSelectedCandidate(isSelected ? null : c)}
                >
                  {/* Rank badge */}
                  <div className="mm-card-rank">#{idx + 1}</div>

                  {/* Status top strip */}
                  {isAccepted && <div className="mm-accepted-strip">✓ ACCEPTED</div>}

                  {/* Top row: avatar + score ring */}
                  <div className="mm-card-top">
                    <div className="mm-avatar" style={{ borderColor: rc }}>
                      {isPending && <span className="mm-avatar-lock">🔒</span>}
                      <span className="mm-avatar-init">{c.initials}</span>
                    </div>
                    {/* Circular score arc */}
                    <div className="mm-card-score-arc">
                      <svg width="52" height="52" viewBox="0 0 52 52">
                        <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(0,230,210,0.08)" strokeWidth="5"/>
                        <circle cx="26" cy="26" r="21" fill="none" stroke={rc} strokeWidth="5"
                          strokeDasharray={`${(c.overallScorePercent/100)*131.9} 131.9`}
                          strokeDashoffset="33" strokeLinecap="round"/>
                        <text x="26" y="27" textAnchor="middle" dominantBaseline="central"
                          fontSize="9" fontWeight="700" fill={rc} fontFamily="var(--font-brand)">{c.overallScorePercent}%</text>
                      </svg>
                    </div>
                  </div>

                  {/* Name + rating */}
                  <div className="mm-card-name">
                    {c.name}
                    <span className="mm-card-badge" style={{ background: `${rc}18`, color: rc, borderColor: `${rc}55` }}>
                      {rating(c.overallScorePercent)}
                    </span>
                  </div>
                  <div className="mm-card-org">{c.currentOrganization.name}</div>
                  <div className="mm-card-exp-row">
                    <span>{c.experience.relevantYears}yr relevant</span>
                    <span className="mm-card-rec-pill" style={{ background:`${rc}15`, color: rc }}>
                      {c.recommendation}
                    </span>
                  </div>

                  {/* Radar */}
                  <div className="mm-card-radar">
                    <MiniRadar candidate={c} size={88}/>
                  </div>

                  {/* Top 3 skills */}
                  <div className="mm-card-skills">
                    {c.technicalSkills.slice(0,3).map(s => (
                      <span key={s} className="mm-card-skill-tag">{s}</span>
                    ))}
                  </div>

                  {isAccepted && (
                    <button className="mm-reveal-btn" onClick={e => { e.stopPropagation(); setSelectedCandidate(c) }}>
                      REVEAL &amp; UNDERWRITE →
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Bottom panels ── */}
          <div className="mm-bottom-row">
            {/* World map */}
            <div className="mm-bottom-card mm-heatmap-panel">
              <div className="mm-bottom-title">
                TALENT SUPPLY HEATMAP
                <span className="mm-bottom-sub"> · AA+ clusters</span>
              </div>
              <svg viewBox="0 0 360 160" className="mm-world-svg" preserveAspectRatio="xMidYMid meet">
                {[40,80,120,160,200,240,280,320].map(x=><line key={x} x1={x} y1="0" x2={x} y2="160" className="mm-grid-line"/>)}
                {[40,80,120].map(y=><line key={y} x1="0" y1={y} x2="360" y2={y} className="mm-grid-line"/>)}
                <polygon className="mm-continent" points="18,28 52,24 70,30 80,50 72,68 58,78 44,80 28,70 16,54 14,40"/>
                <polygon className="mm-continent" points="56,88 72,82 84,90 90,106 86,128 74,140 60,136 52,120 50,102"/>
                <polygon className="mm-continent" points="144,20 168,16 182,22 186,36 178,46 162,50 148,46 140,34"/>
                <polygon className="mm-continent" points="148,54 172,50 190,58 196,80 190,106 174,118 156,116 144,100 140,76 142,60"/>
                <polygon className="mm-continent" points="186,18 230,14 274,16 300,24 310,38 304,56 280,64 244,60 212,54 190,44 184,30"/>
                <polygon className="mm-continent" points="224,58 262,54 282,68 280,84 262,90 238,86 220,74"/>
                <polygon className="mm-continent" points="278,98 308,94 322,100 326,116 314,128 290,130 274,120 272,108"/>
                <polygon className="mm-continent" points="100,6 122,4 128,14 120,22 102,20 96,12"/>
                {[
                  { city:'London',    cx:180, cy:37, count: 3 },
                  { city:'Berlin',    cx:188, cy:35, count: 2 },
                  { city:'Bangalore', cx:247, cy:63, count: 5 },
                  { city:'California',cx:58,  cy:42, count: 4 },
                  { city:'Bengaluru', cx:249, cy:65, count: 5 },
                ].map(dot => (
                  <g key={dot.city}>
                    <circle cx={dot.cx} cy={dot.cy} r={dot.count + 3} fill="rgba(0,230,210,0.08)" stroke="rgba(0,230,210,0.25)" strokeWidth="0.8"/>
                    <circle cx={dot.cx} cy={dot.cy} r="3" className="mm-dot-core"/>
                    <text x={dot.cx} y={dot.cy - 7} className="mm-dot-label" textAnchor="middle">{dot.city}</text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Skill demand bars */}
            <div className="mm-bottom-card mm-volatility-panel">
              <div className="mm-bottom-title">
                SKILL DEMAND INDEX
                <span className="mm-bottom-sub mm-bottom-sub--green"> · +14% HIGH DEMAND</span>
              </div>
              <div className="mm-skill-bars">
                {Object.entries(skillDemand).map(([skill, pct]) => (
                  <div key={skill} className="mm-skill-bar-row">
                    <span className="mm-skill-bar-label">{skill}</span>
                    <div className="mm-skill-bar-track">
                      <div className="mm-skill-bar-fill" style={{ width:`${pct}%` }}/>
                    </div>
                    <span className="mm-skill-bar-pct">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: intelligence panel ── */}
        <div className="mm-right">

          {/* Panel header */}
          <div className="mm-right-header">
            <div className="mm-right-title">INTELLIGENCE PANEL</div>
            <div className="mm-right-sub">AVA · LIVE ANALYSIS</div>
          </div>

          {/* Acceptance leaderboard */}
          <div className="mm-panel-section">
            <div className="mm-panel-section-title">
              ACCEPTANCES RECEIVED
              <span className="mm-panel-count">{acceptedCount} UNLOCKED</span>
            </div>
            {acceptedCount === 0 ? (
              <div className="mm-no-accepted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,230,210,0.3)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                No acceptances yet
              </div>
            ) : (
              <div className="mm-accepted-rows">
                {candidates.filter(c=>c.jobApplicationStatus==='accepted')
                  .sort((a,b)=>b.overallScore-a.overallScore)
                  .map((c,i) => (
                    <div key={c.id} className="mm-accepted-row" onClick={() => setSelectedCandidate(c)}>
                      <span className="mm-acc-rank">#{i+1}</span>
                      <div className="mm-acc-avatar">{c.initials}</div>
                      <div className="mm-acc-info">
                        <span className="mm-acc-name">{c.name}</span>
                        <div className="mm-acc-bar-wrap"><div className="mm-acc-bar" style={{ width:`${c.overallScorePercent}%` }}/></div>
                      </div>
                      <span className="mm-acc-pct">{c.overallScorePercent}%</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Score criteria */}
          <div className="mm-panel-section">
            <div className="mm-panel-section-title">SCORE CRITERIA</div>
            <div className="mm-criteria-list">
              {scoreCriteria.map((c,i) => {
                const colors = ['var(--color-teal)','#22C55E','#F59E0B','#3b82f6','#a855f7']
                return (
                  <div key={c.key} className="mm-criteria-row">
                    <span className="mm-criteria-dot" style={{ background: colors[i] }}/>
                    <span className="mm-criteria-label">{c.label}</span>
                    <span className="mm-criteria-max">/{c.maxScore}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected candidate drawer */}
          {selectedCandidate ? (
            <div className="mm-detail-panel">
              <div className="mm-detail-close" onClick={() => setSelectedCandidate(null)}>✕ CLOSE</div>

              {/* Header: ring + info */}
              <div className="mm-detail-header">
                <ScoreRing pct={selectedCandidate.overallScorePercent}
                  color={recColor(selectedCandidate)} size={72}/>
                <div className="mm-detail-info">
                  <div className="mm-detail-name">{selectedCandidate.name}</div>
                  <div className="mm-detail-rec" style={{ color: recColor(selectedCandidate) }}>
                    {selectedCandidate.recommendation} · {rating(selectedCandidate.overallScorePercent)}
                  </div>
                  <div className="mm-detail-org">{selectedCandidate.currentOrganization.name}</div>
                  <div className="mm-detail-exp">
                    {selectedCandidate.experience.relevantYears}yr relevant · {selectedCandidate.experience.totalYears}yr total
                  </div>
                </div>
              </div>

              <div className="mm-detail-edu">{selectedCandidate.education.raw}</div>

              {/* Score breakdown */}
              <div className="mm-detail-scores">
                {selectedCandidate.scoreBreakdown.map(s => (
                  <ScoreBar key={s.criterion} label={s.label} score={s.score} maxScore={s.maxScore}/>
                ))}
              </div>

              {/* Justification */}
              <div className="mm-detail-section-title">AI JUSTIFICATION</div>
              <div className="mm-detail-justification">{selectedCandidate.justification}</div>

              {/* Interview probes */}
              <div className="mm-detail-section-title">INTERVIEW PROBES</div>
              <div className="mm-detail-probes">
                {selectedCandidate.interviewProbes.map((p,i) => (
                  <div key={i} className="mm-detail-probe">
                    <span className="mm-probe-num">{i+1}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="mm-detail-skills">
                {selectedCandidate.technicalSkills.slice(0,12).map(s => (
                  <span key={s} className="mm-detail-skill-tag">{s}</span>
                ))}
              </div>

              {/* Status */}
              <div className="mm-detail-status-row"
                style={{ borderColor: selectedCandidate.jobApplicationStatus === 'accepted' ? 'rgba(34,197,94,0.3)' : 'var(--color-black-border)' }}>
                <span className="mm-status-dot"
                  style={{ background: selectedCandidate.jobApplicationStatus === 'accepted' ? '#22C55E' : 'var(--color-text-muted)' }}/>
                <span style={{ color: selectedCandidate.jobApplicationStatus === 'accepted' ? '#22C55E' : 'var(--color-text-muted)' }}>
                  {selectedCandidate.jobApplicationStatus.replace('_',' ').toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div className="mm-panel-hint">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,230,210,0.25)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span>Click a candidate card to view full profile</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Human Capital Market Terminal (HCMT) ─────────────────────────────────────
// Uses the app brand font (Satoshi) throughout — matching the left navigation.
const APP_FONT = "var(--font-brand)"

// Radar — 5-axis pentagon matching the reference exactly
const HCMTRadar = ({ vectors }) => {
  const cx = 100, cy = 90
  // axis angles matching reference: PERF top, ARCH right, ADAPT br, COMP bl, LEAD left
  const axes = [
    { ang: -90, label: 'PERFORMANCE', r: vectors[0]?.pct ?? 0 },
    { ang: -18, label: 'ARCH',        r: vectors[2]?.pct ?? 0 },
    { ang:  54, label: 'ADAPT',       r: vectors[4]?.pct ?? 0 },
    { ang: 126, label: 'COMPLIANCE',  r: vectors[1]?.pct ?? 0 },
    { ang: 198, label: 'LEAD',        r: vectors[3]?.pct ?? 0 },
  ]
  // outer grid ring points (at r=70 → full)
  const maxR = 70
  const toPt = (ang, r) => {
    const a = ang * Math.PI / 180
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }
  const outerPts = axes.map(a => toPt(a.ang, maxR))
  const innerPts = axes.map(a => toPt(a.ang, maxR * 0.55))
  const dataPts  = axes.map(a => toPt(a.ang, maxR * (a.r / 100)))
  const polyStr = pts => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const labelPts = axes.map(a => toPt(a.ang, maxR + 16))

  return (
    <svg viewBox="0 0 200 180" width="100%" style={{ maxHeight: 200 }}>
      {/* grid outer + inner rings */}
      <polygon points={polyStr(outerPts)} fill="none" stroke="oklch(40% 0.04 250)" strokeWidth="1" />
      <polygon points={polyStr(innerPts)} fill="none" stroke="oklch(40% 0.04 250)" strokeWidth="1" />
      {/* axis lines */}
      {axes.map((a, i) => {
        const outer = toPt(a.ang, maxR)
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke="oklch(40% 0.04 250)" strokeWidth="1" />
      })}
      {/* data polygon — green fill */}
      <polygon points={polyStr(dataPts)} fill="oklch(68% 0.17 145 / 0.25)" stroke="oklch(70% 0.17 145)" strokeWidth="2" strokeLinejoin="round" />
      {/* axis labels */}
      {axes.map((a, i) => (
        <text key={i} x={labelPts[i].x.toFixed(1)} y={labelPts[i].y.toFixed(1)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill="oklch(75% 0.02 250)" fontFamily={APP_FONT}>{a.label}</text>
      ))}
    </svg>
  )
}

const JDVisualView = ({ file, onPost, onBack }) => {
  const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()

  // ── Parsed data (simulated AI extraction) ───────────────────────────
  const ticker   = 'AVA: SDE-CLOUD'
  const roleTitle = 'SENIOR CLOUD DATA ENGINEER'
  const assetClass = 'HUMAN CAPITAL: DATA ENG.'
  const issueDate = today
  const status    = 'ACTIVE BUY ORDER (HIRING)'
  const matchPool = 18
  const compRange = '£150k – £195k'
  const strategyBrief = [
    'This Senior Cloud Data Engineer is a direct "Asset-Liability Match" to our Q3 goal of reducing platform latency by 20%.',
    { amber: true, text: '**COMPLIANCE AT ZERO IS ACCEPTABLE due to existing legal infrastructure.**' },
    { label: 'CAPITAL OUTLAY TARGET:', value: '£195k (MAX)' },
  ]

  // Competency vectors — left panel
  const vectors = [
    { name: 'PERFORMANCE (PERF)',    val: '9.5/10', tag: '[MAX]',      pct: 95, color: 'oklch(70% 0.17 145)', target: 'TARGET PERF SCORE: 850', premium: '+15% PREMIUM FOR PERFORMANCE VECTOR' },
    { name: 'COMPLIANCE (COMP)',     val: '2.0/10', tag: '[MIN]',      pct: 20, color: 'oklch(65% 0.2 25)',   target: 'TARGET COMP SCORE: 350',  premium: null },
    { name: 'ARCHITECTURE (ARCH)',   val: '7.5/10', tag: '[HIGH]',     pct: 75, color: 'oklch(72% 0.15 195)', target: null, premium: null },
    { name: 'LEADERSHIP (LEAD)',     val: '5.0/10', tag: '[MODERATE]', pct: 50, color: 'oklch(75% 0.13 80)',  target: null, premium: null },
    { name: 'ADAPTABILITY (ADAPT)',  val: '6.5/10', tag: '[HIGH]',     pct: 65, color: 'oklch(72% 0.15 195)', target: null, premium: null },
  ]

  // Proof of work — right panel
  const proofs = [
    { mark: '✓', ok: true,  title: '[[GITHUB]] COMMITS',   desc: 'PERF OPTIMIZATION, CACHING' },
    { mark: '✓', ok: true,  title: '[[JIRA]] ROLE',        desc: 'TECH LEAD, SCALE MIGRATIONS' },
    { mark: '✓', ok: true,  title: '[[CLOUD CERT.]]',      desc: 'AWS ARCHITECT, PERFORMANCE SPECIALIST' },
    { mark: '⊗', ok: false, title: '[DISABLED] [HIPAA/GDPR]', desc: 'GDPR ENVIRONMENT · *MIN COMP REQUIREMENT' },
  ]

  // ── Shared style tokens ──────────────────────────────────────────────
  const panel = {
    background: 'oklch(18% 0.03 250)',
    border:     '1px solid oklch(45% 0.16 195 / 0.5)',
    borderRadius: 4,
    boxShadow:  '0 0 0 1px oklch(60% 0.2 195 / 0.12), 0 0 20px oklch(60% 0.22 195 / 0.18)',
    display: 'flex', flexDirection: 'column',
  }
  const panelHead = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid oklch(45% 0.16 195 / 0.4)',
    padding: '10px 14px',
  }
  const panelTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'oklch(85% 0.02 250)' }
  const panelIcon  = {
    width: 20, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid oklch(35% 0.03 250)', color: 'oklch(60% 0.02 250)',
    borderRadius: 2, fontSize: 11, cursor: 'default',
  }
  const sectionPad = { padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }
  const label12 = { fontSize: 12, fontWeight: 700, color: 'oklch(88% 0.02 195)', letterSpacing: '0.03em' }
  const muted   = { fontSize: 10, color: 'oklch(55% 0.02 250)', letterSpacing: '0.04em', marginTop: 6 }

  return (
    // Root uses APP_FONT (Satoshi) — same font as the left navigation
    <div style={{
      fontFamily: APP_FONT,
      background: 'oklch(13% 0.025 250)',
      color: 'oklch(90% 0.02 145)',
      padding: 'clamp(10px,1.5vw,20px)',
      display: 'flex', flexDirection: 'column', gap: 12,
      borderRadius: 8,
    }}>

      {/* ── TITLE BAR ── */}
      <div style={{ ...panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ letterSpacing: '0.25em', fontSize: 11, color: 'oklch(55% 0.02 250)' }}>▤▤▤</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'oklch(85% 0.02 250)' }}>
          HUMAN CAPITAL MARKET TERMINAL (HCMT) — AVA RECRUITER
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(70% 0.15 195)' }}>
            {file.name.toUpperCase().replace(/\.[^.]+$/, '')}
          </span>
          <span style={{ fontSize: 12, color: 'oklch(55% 0.02 250)', letterSpacing: '0.15em' }}>▤ _ ▢ ✕</span>
        </div>
      </div>

      {/* ── TICKER HEADER ── */}
      <div style={{ ...panel, padding: '16px 18px', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(14px,1.6vw,22px)', fontWeight: 800, letterSpacing: '0.04em', color: 'oklch(90% 0.02 195)' }}>
            TICKER:
          </span>
          <span style={{
            fontSize: 'clamp(14px,1.6vw,22px)', fontWeight: 800, letterSpacing: '0.04em',
            color: 'oklch(20% 0.03 250)', background: 'oklch(72% 0.15 80)',
            boxShadow: '0 0 14px oklch(72% 0.18 80 / 0.6)',
            borderRadius: 3, padding: '2px 10px',
          }}>{ticker}</span>
          <span style={{ fontSize: 'clamp(14px,1.6vw,22px)', fontWeight: 800, letterSpacing: '0.03em', color: 'oklch(70% 0.15 195)' }}>
            {roleTitle}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, letterSpacing: '0.03em' }}>
          <div><span style={{ color: 'oklch(90% 0.02 195)', fontWeight: 700 }}>ASSET CLASS:</span> <span style={{ color: 'oklch(75% 0.02 250)' }}>{assetClass}</span></div>
          <div><span style={{ color: 'oklch(90% 0.02 195)', fontWeight: 700 }}>ISSUE DATE:</span> <span style={{ color: 'oklch(75% 0.02 250)' }}>{issueDate}</span></div>
        </div>
        <div style={{ fontSize: 13, letterSpacing: '0.03em' }}>
          <span style={{ color: 'oklch(90% 0.02 195)', fontWeight: 700 }}>STATUS: </span>
          <span style={{ color: 'oklch(70% 0.17 145)', fontWeight: 700 }}>{status}</span>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 12, alignItems: 'stretch' }}>

        {/* COL 1 — COMPETENCY VECTORS */}
        <section style={panel}>
          <div style={panelHead}>
            <span style={panelTitle}>PARAMETRIC BUY ORDER – COMPETENCY VECTORS</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ ...panelIcon, border: '1px solid oklch(72% 0.15 80 / 0.6)', color: 'oklch(72% 0.15 80)' }}>+</span>
              <span style={panelIcon}>⤢</span>
            </div>
          </div>
          <div style={sectionPad}>
            {vectors.map((v, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'oklch(88% 0.02 195)' }}>{v.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: v.color }}>{v.val}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: v.color }}>{v.tag}</span>
                </div>
                {/* progress bar with glowing dot */}
                <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'oklch(26% 0.02 250)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v.pct}%`, borderRadius: 3, background: 'oklch(68% 0.17 145)' }} />
                  <div style={{ position: 'absolute', top: '50%', left: `${v.pct}%`, width: 14, height: 14, borderRadius: '50%', background: 'oklch(72% 0.17 145)', boxShadow: '0 0 10px oklch(70% 0.2 145 / 0.9)', transform: 'translate(-50%,-50%)' }} />
                </div>
                {v.target && <div style={muted}>▸ {v.target}</div>}
                {v.premium && (
                  <div style={{ marginTop: 8, display: 'inline-block', background: 'oklch(24% 0.05 80)', border: '1px solid oklch(72% 0.15 80 / 0.6)', borderRadius: 3, padding: '6px 10px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: 'oklch(65% 0.08 80)' }}>VECTOR PREMIUM CALCULATION</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'oklch(80% 0.15 80)', marginTop: 2 }}>{v.premium}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* COL 2 — FAIR VALUE & RADAR */}
        <section style={panel}>
          <div style={panelHead}>
            <span style={panelTitle}>DYNAMIC FAIR VALUE &amp; MATCHING</span>
            <span style={panelIcon}>≣</span>
          </div>
          <div style={sectionPad}>
            <div>
              <div style={label12}>MARKET MATCH (POOL):</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: 'oklch(70% 0.17 145)' }}>{matchPool}</span>
                {' '}<span style={{ fontSize: 12, color: 'oklch(70% 0.02 250)' }}>ACTIVE MATCHING CANDIDATES</span>
              </div>
            </div>
            <div style={{ height: 1, background: 'oklch(32% 0.03 250)' }} />
            <div>
              <div style={label12}>EST. TOTAL COMP RANGE:</div>
              <div style={{ fontSize: 'clamp(20px,2.2vw,28px)', fontWeight: 800, color: 'oklch(70% 0.15 195)', marginTop: 4, textShadow: '0 0 16px oklch(60% 0.2 195 / 0.5)' }}>{compRange}</div>
              <div style={{ fontSize: 9, color: 'oklch(55% 0.02 250)', letterSpacing: '0.08em', marginTop: 2 }}>INDEXED TO SCORE TICKER</div>
            </div>
            {/* Radar chart */}
            <div style={{ background: 'oklch(15% 0.025 250)', border: '1px solid oklch(45% 0.16 195 / 0.35)', borderRadius: 4, padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(70% 0.02 250)', marginBottom: 6 }}>TARGET PROFILE SHAPE</div>
              <div style={{ position: 'relative', flex: 1, minHeight: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HCMTRadar vectors={vectors} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'oklch(50% 0.01 250)', fontWeight: 700 }}>
                <span>LOW</span><span>HIGH</span>
              </div>
            </div>
          </div>
        </section>

        {/* COL 3 — PROOF OF WORK */}
        <section style={panel}>
          <div style={panelHead}>
            <span style={panelTitle}>REQUIRED PROOF OF WORK &amp; VERIFICATION</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={panelIcon}>⎘</span>
              <span style={panelIcon}>≣</span>
            </div>
          </div>
          <div style={{ ...sectionPad, gap: 12 }}>
            {proofs.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: p.ok ? 1 : 0.6 }}>
                <span style={{
                  width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 3, marginTop: 1, fontSize: 12, fontWeight: 800,
                  border: p.ok ? '1px solid oklch(60% 0.15 145 / 0.7)' : '1px solid oklch(35% 0.03 250)',
                  color: p.ok ? 'oklch(70% 0.17 145)' : 'oklch(55% 0.02 250)',
                }}>{p.mark}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', color: p.ok ? 'oklch(88% 0.02 195)' : 'oklch(58% 0.02 250)' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: p.ok ? 'oklch(72% 0.02 250)' : 'oklch(48% 0.02 250)', marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── STRATEGY BRIEF (ROI) ── */}
      <section style={panel}>
        <div style={panelHead}>
          <span style={panelTitle}>STRATEGY BRIEF (ROI)</span>
          <span style={panelIcon}>≣</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.5, color: 'oklch(80% 0.06 145)' }}>
          {strategyBrief.map((line, i) =>
            typeof line === 'string'
              ? <div key={i}>{line}</div>
              : line.amber
                ? <div key={i} style={{ color: 'oklch(80% 0.13 80)', fontWeight: 700 }}>{line.text}</div>
                : <div key={i}><span style={{ color: 'oklch(88% 0.02 195)', fontWeight: 700 }}>{line.label} </span><span style={{ color: 'oklch(70% 0.15 195)', fontWeight: 800 }}>{line.value}</span></div>
          )}
        </div>
      </section>

      {/* ── ACTION ROW — uses app brand font (Satoshi) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button className="rl-back-btn" onClick={onBack} style={{ fontFamily: APP_FONT }}>← BACK</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="rl-pulse" />
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: 'oklch(55% 0.02 250)', fontFamily: APP_FONT }}>
            AVA HAS PARSED <strong style={{ color: 'oklch(70% 0.15 195)' }}>{vectors.length} COMPETENCY VECTORS</strong> — READY TO POST
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="rl-ghost-btn" onClick={onBack} style={{ fontFamily: APP_FONT }}>EDIT JD</button>
          <button className="rl-cta-btn" onClick={onPost} style={{ fontFamily: APP_FONT }}>POST ROLE &amp; START MATCHING</button>
        </div>
      </div>
    </div>
  )
}

// ─── Post Job view ────────────────────────────────────────────────────────────
const PostJobView = ({ onBack, onJobPosted }) => {
  const [mode, setMode]           = useState(null)        // null | 'visual' | 'manual'
  const [dragOver, setDragOver]   = useState(false)
  const [uploadedFile, setUploaded] = useState(null)
  const fileInputRef              = useRef(null)

  // Manual form state
  const [form, setForm] = useState({
    title: '', department: '', location: '', type: 'Full-time',
    seniority: 'Mid', salary: '', description: '', requirements: '',
    niceToHave: '', closingDate: '', urgency: 'Medium',
  })
  const [submitted, setSubmitted] = useState(false)
  const [posting, setPosting]     = useState(false)
  const [postError, setPostError] = useState(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (file) { setUploaded(file); setMode('visual') }
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) { setUploaded(file); setMode('visual') }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    setPosting(true); setPostError(null)
    try {
      const saved = await postJob({ ...form, dept: form.department })
      onJobPosted?.(saved)
      setSubmitted(true)
    } catch (err) {
      setPostError('Could not save job. Please try again.')
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  // ── Submitted confirmation ──
  if (submitted) return (
    <div className="rl-content">
      <div className="rl-page-header">
        <button className="rl-back-btn" onClick={onBack}>← BACK TO JOB ROLES</button>
      </div>
      <div className="rl-post-success">
        <div className="rl-success-icon">✓</div>
        <div className="rl-success-title">JOB ROLE POSTED</div>
        <div className="rl-success-sub">AVA is now matching candidates to <strong>{form.title || 'your role'}</strong>.</div>
        <div className="rl-success-chips">
          <span className="rl-chip">AI Matching Active</span>
          <span className="rl-chip">Evidence Pipeline Open</span>
          <span className="rl-chip">Shortlisting Enabled</span>
        </div>
        <button className="rl-cta-btn" onClick={onBack}>VIEW ALL ROLES</button>
      </div>
    </div>
  )

  // ── JD uploaded → Human Capital Terminal visual ──
  if (mode === 'visual' && uploadedFile) return (
    <JDVisualView
      file={uploadedFile}
      onBack={() => { setUploaded(null); setMode(null) }}
      onPost={async () => {
        try {
          const saved = await postJob({
            title: uploadedFile.name.replace(/\.[^.]+$/, ''),
            dept: '',
            urgency: 'Medium',
          })
          onJobPosted?.(saved)
        } catch (err) {
          console.error('postJob (visual):', err)
        }
        setSubmitted(true)
      }}
    />
  )

  // ── Mode selector or manual form ──
  return (
    <div className="rl-content">
      <div className="rl-page-header">
        <div>
          <div className="rl-page-title">POST A JOB ROLE</div>
          <div className="rl-page-sub">Upload a JD or fill in the details manually</div>
        </div>
        <button className="rl-back-btn" onClick={onBack}>← BACK</button>
      </div>

      {mode !== 'manual' && (
        <>
          {/* ── JD Upload dropzone ── */}
          <div
            className={`rl-dropzone${dragOver ? ' dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display:'none' }} onChange={handleFileInput} />
            <div className="rl-dropzone-icon">📋</div>
            <div className="rl-dropzone-title">DROP YOUR JD HERE</div>
            <div className="rl-dropzone-sub">Drag &amp; drop a PDF, DOCX or TXT job description — or click to browse</div>
            <button className="rl-cta-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>CHOOSE FILE</button>
          </div>

          <div className="rl-or-divider"><span>OR</span></div>
        </>
      )}

      {/* ── Manual form ── */}
      {(mode === 'manual' || mode !== 'upload') && (
        <div className="rl-post-card">
          <div className="rl-post-card-title">
            {mode === 'manual' ? 'FILL JOB DETAILS' : 'FILL IN MANUALLY'}
            {mode !== 'manual' && (
              <button className="rl-text-btn" onClick={() => setMode('manual')}>EXPAND FORM ↓</button>
            )}
          </div>

          {mode === 'manual' && (
            <form className="rl-manual-form" onSubmit={handleManualSubmit}>
              {/* Row 1 */}
              <div className="rl-form-row">
                <div className="rl-form-field rl-span-2">
                  <label>Job Title *</label>
                  <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Senior Data Engineer" required />
                </div>
                <div className="rl-form-field">
                  <label>Department *</label>
                  <input value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} placeholder="e.g. Engineering" required />
                </div>
                <div className="rl-form-field">
                  <label>Location</label>
                  <input value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. London / Remote" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="rl-form-row">
                <div className="rl-form-field">
                  <label>Employment Type</label>
                  <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                    {['Full-time','Part-time','Contract','Freelance','Internship'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="rl-form-field">
                  <label>Seniority</label>
                  <select value={form.seniority} onChange={e => setForm(f=>({...f,seniority:e.target.value}))}>
                    {['Junior','Mid','Senior','Lead','Manager','Director'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="rl-form-field">
                  <label>Urgency</label>
                  <select value={form.urgency} onChange={e => setForm(f=>({...f,urgency:e.target.value}))}>
                    {['Low','Medium','High'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="rl-form-field">
                  <label>Salary Range</label>
                  <input value={form.salary} onChange={e => setForm(f=>({...f,salary:e.target.value}))} placeholder="e.g. £70k–£90k" />
                </div>
              </div>

              {/* Row 3 */}
              <div className="rl-form-row">
                <div className="rl-form-field rl-span-2">
                  <label>Job Description *</label>
                  <textarea rows={5} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the role, responsibilities and team context…" required />
                </div>
                <div className="rl-form-field rl-span-2">
                  <label>Requirements *</label>
                  <textarea rows={4} value={form.requirements} onChange={e => setForm(f=>({...f,requirements:e.target.value}))} placeholder="List required skills, experience and qualifications…" required />
                </div>
              </div>

              {/* Row 4 */}
              <div className="rl-form-row">
                <div className="rl-form-field rl-span-2">
                  <label>Nice to Have</label>
                  <textarea rows={3} value={form.niceToHave} onChange={e => setForm(f=>({...f,niceToHave:e.target.value}))} placeholder="Optional skills or experience that would be a bonus…" />
                </div>
                <div className="rl-form-field">
                  <label>Closing Date</label>
                  <input type="date" value={form.closingDate} onChange={e => setForm(f=>({...f,closingDate:e.target.value}))} />
                </div>
              </div>

              {postError && <div className="rl-post-error">{postError}</div>}
              <div className="rl-post-actions">
                <button type="submit" className="rl-cta-btn" disabled={posting}>
                  {posting ? 'POSTING…' : 'POST ROLE & START MATCHING'}
                </button>
                <button type="button" className="rl-ghost-btn" onClick={() => setMode(null)}>CANCEL</button>
              </div>
            </form>
          )}

          {mode !== 'manual' && (
            <div className="rl-manual-teaser">
              <div className="rl-teaser-fields">
                {['Job Title','Department','Employment Type','Seniority','Description','Requirements'].map(f => (
                  <span key={f} className="rl-chip">{f}</span>
                ))}
              </div>
              <button className="rl-cta-btn" onClick={() => setMode('manual')}>FILL MANUALLY</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main landing page ─────────────────────────────────────────────────────
const LandingPage = ({ user, onLogout }) => {
  const [view, setView]         = useState('dashboard')
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)
  const [overlay, setOverlay]   = useState(false)
  const [jobs, setJobs]         = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [closedJobs, setClosedJobs]   = useState([])
  const [jobsTab, setJobsTab]         = useState('open') // 'open' | 'closed'

  // Load jobs from API on mount
  useEffect(() => {
    fetchJobs()
      .then(data => setJobs(data))
      .catch(err => console.error('fetchJobs:', err))
      .finally(() => setJobsLoading(false))
  }, [])

  // Called by PostJobView after a successful POST /api/jobs
  const handleJobPosted = (newJob) => {
    setJobs(prev => [newJob, ...prev])
  }

  // Called by MatchingMatrixView when recruiter closes a role
  const handleCloseJob = (job) => {
    setJobs(prev => prev.filter(j => (j.id || j.title) !== (job.id || job.title)))
    setClosedJobs(prev => [{ ...job, closedAt: new Date().toISOString() }, ...prev])
    setView('jobs')
    setJobsTab('closed')
  }

  const navItems = [
    { id: 'dashboard',  label: 'Dashboard',  badge: null },
    { id: 'jobs',       label: 'Job Roles',  badge: jobs.length > 0 ? String(jobs.length) : null },
    { id: 'candidates', label: 'Candidates', badge: '247' },
    { id: 'analytics',  label: 'Analytics',  badge: null },
    { id: 'settings',   label: 'Settings',   badge: null },
  ]

  const handleNav = (id) => {
    setView(id)
    if (window.innerWidth < 768) { setCollapsed(true); setOverlay(false) }
  }

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      const next = !collapsed
      setCollapsed(next)
      setOverlay(!next)
    } else {
      setCollapsed(c => !c)
    }
  }

  const candidates = [
    { name: 'John Denver',    role: 'Senior Data Engineer',     score: 875, rating: 'AA+', status: 'Shortlisted' },
    { name: 'Sarah Chen',     role: 'ML Platform Engineer',     score: 842, rating: 'AA',  status: 'Interviewing' },
    { name: 'Marcus Reid',    role: 'Cloud Infrastructure Lead', score: 810, rating: 'AA',  status: 'Active' },
    { name: 'Priya Nair',     role: 'Data Science Manager',      score: 798, rating: 'A+',  status: 'New' },
    { name: 'James Callahan', role: 'DevOps Engineer',           score: 763, rating: 'A+',  status: 'Active' },
  ]

  return (
    <div className={`rl-page${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="rl-bg" />

      {/* ── Mobile overlay — tap outside to close (cv-profile-visualizer pattern) ── */}
      <div
        className={`rl-overlay${!collapsed && overlay ? ' visible' : ''}`}
        onClick={() => { setCollapsed(true); setOverlay(false) }}
      />

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`rl-sidebar${collapsed ? ' collapsed' : ''}`}>

        {/* Header: logo + brand + status + toggle — matches cv-profile-visualizer */}
        <div className="rl-sidebar-header">
          <div className="rl-sidebar-brand">
            <img src="/assets/ava-logo.png" alt="AVA" className="rl-sidebar-logo" />
            <div className="rl-sidebar-brand-text rl-hide-collapsed">
              <span className="rl-sidebar-brand-name">AVA</span>
              <span className="rl-sidebar-brand-sub">RECRUITER</span>
            </div>
          </div>

          {/* Chevron toggle — flips direction like cv-profile-visualizer */}
          <button
            className="rl-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Status dot — inside header, hidden when collapsed */}
          <div className="rl-sidebar-status rl-hide-collapsed">
            <span className="rl-pulse" />
            <span className="rl-sidebar-status-text">SYSTEM ACTIVE</span>
          </div>
        </div>

        {/* Module label */}
        <div className="rl-sidebar-label rl-hide-collapsed">NAVIGATION MODULES</div>

        {/* Nav items */}
        <nav className="rl-sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`rl-nav-item${view === item.id ? ' active' : ''}`}
              onClick={() => handleNav(item.id)}
              title={collapsed ? item.label : ''}
            >
              <span className="rl-nav-icon">{Icons[item.id] || Icons.settings}</span>
              <span className="rl-nav-label rl-hide-collapsed">{item.label.toUpperCase()}</span>
              {item.badge && <span className={`rl-nav-badge${collapsed ? ' rl-hide-collapsed' : ''}`}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="rl-sidebar-divider" />

        {/* User footer */}
        <div className="rl-sidebar-footer">
          <div className="rl-user-mini">
            <img src={user.picture} alt={user.name} className="rl-user-mini-avatar" />
            <div className="rl-user-mini-info rl-hide-collapsed">
              <span className="rl-user-mini-name">{user.name.toUpperCase()}</span>
              <span className="rl-user-mini-email">{user.email}</span>
            </div>
          </div>
          <div className="rl-sidebar-footer-tag rl-hide-collapsed">AVA GUIDES — HUMAN DECIDES</div>
          <button className="rl-sidebar-logout rl-hide-collapsed" onClick={onLogout}>LOGOUT</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="rl-main-wrap">

        {/* ── TOP BAR (title + actions) ── */}
        <header className="rl-topbar">

          {/* Hamburger — mobile only, opens the sidebar drawer */}
          <button className="rl-mob-toggle" onClick={toggleSidebar} aria-label="Open navigation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="rl-topbar-title">
            {view === 'dashboard'  && 'DASHBOARD'}
            {view === 'candidates' && 'CANDIDATE POOL'}
            {view === 'jobs'       && 'JOB ROLES'}
            {view === 'post-job'   && 'POST A JOB ROLE'}
            {view === 'matches'    && 'MATCHING MATRIX'}
            {view === 'analytics'  && 'TALENT ANALYTICS'}
            {view === 'settings'   && 'SETTINGS'}
          </div>

          <div className="rl-topbar-actions">
            {/* + POST ROLE — visible on jobs view, all screen sizes */}
            {(view === 'jobs' || view === 'post-job') && (
              <button className="rl-cta-btn" onClick={() => setView('post-job')}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.62rem' }}>
                + POST ROLE
              </button>
            )}
            <div className="rl-ethical-tag rl-hide-mobile">
              <span className="rl-pulse" />AVA GUIDES — HUMAN DECIDES
            </div>
          </div>
        </header>

        {/* ── CONTENT AREA ── */}
        <main className="rl-main">

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <div className="rl-dashboard">
              <div className="rl-explain-banner">
                <span className="rl-pulse" />
                <span>AVA INTELLIGENCE ACTIVE — Every recommendation is evidence-based and explainable. <strong>AVA Guides — Human Decides.</strong></span>
              </div>
              <div className="rl-stats-grid">
                <StatCard label="Active Candidates"  value="247"  delta="↑ 18 this week"       accent="var(--color-teal)" />
                <StatCard label="Open Roles"         value={String(jobs.length)}   delta={`${jobs.filter(j=>j.urgency==='High').length} high urgency`}  accent="#F59E0B" />
                <StatCard label="AI Matches Today"   value="63"   delta="↑ 94% accuracy"        accent="#22C55E" />
                <StatCard label="Avg Talent Score"   value="821"  delta="AA+ cohort"            accent="oklch(68% 0.17 145)" />
                <StatCard label="Time-to-Shortlist"  value="2.4d" delta="↓ 38% vs manual"       accent="var(--color-teal)" />
                <StatCard label="Pipeline Coverage"  value="91%"  delta="Role requirements met" accent="#22C55E" />
              </div>
              <div className="rl-two-col">
                <section className="rl-card">
                  <div className="rl-card-header"><div className="rl-card-title">TOP MATCHED CANDIDATES</div><div className="rl-card-sub">RANKED BY TALENT CREDIT SCORE</div></div>
                  <div className="rl-candidates-list">{candidates.map(c=><CandidateRow key={c.name} {...c}/>)}</div>
                </section>
                <section className="rl-card">
                  <div className="rl-card-header"><div className="rl-card-title">ACTIVE JOB ROLES</div><div className="rl-card-sub">AI MATCH PIPELINE</div></div>
                  <div className="rl-jobs-grid">{jobs.slice(0,4).map(j=><JobCard key={j.title} {...j} onReviewMatches={()=>{ setSelectedJob(j); setView('matches') }}/>)}</div>
                </section>
              </div>
              <div className="rl-two-col">
                <section className="rl-card">
                  <div className="rl-card-header"><div className="rl-card-title">PIPELINE ACTIVITY</div><div className="rl-card-sub">LAST 7 DAYS</div></div>
                  <div className="rl-activity-list">
                    {[
                      { action:'New application', name:'Aisha Okonkwo',  role:'ML Engineer',      time:'12m ago' },
                      { action:'Score updated',   name:'John Denver',    role:'Data Engineer',    time:'1h ago'  },
                      { action:'Interview set',   name:'Sarah Chen',     role:'ML Platform',      time:'3h ago'  },
                      { action:'Shortlisted',     name:'Marcus Reid',    role:'Cloud Infra Lead', time:'5h ago'  },
                      { action:'New application', name:'Tom Hargreaves', role:'DevOps Engineer',  time:'8h ago'  },
                    ].map((a,i) => (
                      <div key={i} className="rl-activity-row">
                        <span className="rl-activity-dot" />
                        <div className="rl-activity-body">
                          <span className="rl-activity-action">{a.action}</span>
                          <span className="rl-activity-name"> — {a.name}</span>
                          <span className="rl-activity-role"> · {a.role}</span>
                        </div>
                        <span className="rl-activity-time">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rl-card">
                  <div className="rl-card-header"><div className="rl-card-title">AVA INSIGHT</div><div className="rl-card-sub">AI RECOMMENDATION</div></div>
                  <div className="rl-insight-body">
                    <div className="rl-insight-score"><div className="rl-insight-num">94<span>%</span></div><div className="rl-insight-label">Pipeline Match Rate</div></div>
                    <div className="rl-insight-items">
                      {[{label:'Python / SQL demand',pct:92},{label:'Cloud (AWS/GCP)',pct:78},{label:'ML / Data Science',pct:71},{label:'Leadership signals',pct:55}].map(item=>(
                        <div key={item.label} className="rl-insight-bar-row">
                          <span className="rl-insight-bar-label">{item.label}</span>
                          <div className="rl-insight-bar-track"><div className="rl-insight-bar-fill" style={{width:`${item.pct}%`}}/></div>
                          <span className="rl-insight-bar-pct">{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rl-insight-cta"><button className="rl-cta-btn">GENERATE FULL REPORT</button></div>
                </section>
              </div>
            </div>
          )}

          {/* CANDIDATES */}
          {view === 'candidates' && (
            <div className="rl-dashboard">
              <div className="rl-page-header">
                <div><div className="rl-page-title">CANDIDATE POOL</div><div className="rl-page-sub">247 active candidates · ranked by AVA talent score</div></div>
                <button className="rl-cta-btn">+ UPLOAD CV</button>
              </div>
              <section className="rl-card"><div className="rl-candidates-list">{candidates.map(c=><CandidateRow key={c.name} {...c}/>)}</div></section>
            </div>
          )}

          {/* JOB ROLES */}
          {view === 'jobs' && (
            <div className="rl-dashboard">
              <div className="rl-page-header">
                <div>
                  <div className="rl-page-title">JOB ROLES</div>
                  <div className="rl-page-sub">
                    {jobsTab === 'open'
                      ? `${jobs.length} active role${jobs.length !== 1 ? 's' : ''} · AI matching enabled`
                      : `${closedJobs.length} closed role${closedJobs.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  {/* Open / Closed tab pills */}
                  <div className="rl-jobs-tabs">
                    <button className={`rl-jobs-tab${jobsTab==='open'?' active':''}`} onClick={() => setJobsTab('open')}>
                      OPEN <span className="rl-tab-badge">{jobs.length}</span>
                    </button>
                    <button className={`rl-jobs-tab${jobsTab==='closed'?' active':''}`} onClick={() => setJobsTab('closed')}>
                      CLOSED <span className="rl-tab-badge">{closedJobs.length}</span>
                    </button>
                  </div>
                  {jobsTab === 'open' && (
                    <button className="rl-cta-btn" onClick={() => setView('post-job')}>+ POST ROLE</button>
                  )}
                </div>
              </div>

              {jobsTab === 'open' && (
                <div className="rl-jobs-full-grid">
                  {jobs.map(j => (
                    <JobCard key={j.id || j.title} {...j}
                      onReviewMatches={() => { setSelectedJob(j); setView('matches') }}
                    />
                  ))}
                </div>
              )}

              {jobsTab === 'closed' && (
                <div className="rl-jobs-full-grid">
                  {closedJobs.length === 0 ? (
                    <div className="rl-empty-state">No closed roles yet.</div>
                  ) : closedJobs.map(j => (
                    <div key={j.id || j.title} className="rl-job-card rl-job-card--closed">
                      <div className="rl-job-header">
                        <div>
                          <div className="rl-job-title">{j.title}</div>
                          <div className="rl-job-dept">{j.dept}</div>
                        </div>
                        <span className="rl-closed-badge">CLOSED</span>
                      </div>
                      <div className="rl-job-stats">
                        <div className="rl-job-stat"><span>{j.applicants || 0}</span><label>Applicants</label></div>
                        <div className="rl-job-stat"><span style={{color:'var(--color-text-muted)'}}>{j.matched || 0}</span><label>Matched</label></div>
                      </div>
                      <div className="rl-closed-date">
                        Closed {j.closedAt ? new Date(j.closedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'recently'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POST JOB */}
          {view === 'post-job' && <PostJobView onBack={() => setView('jobs')} onJobPosted={handleJobPosted} />}

          {/* MATCHING MATRIX */}
          {view === 'matches' && <MatchingMatrixView job={selectedJob} onBack={() => setView('jobs')} onClose={handleCloseJob} />}

          {/* ANALYTICS */}
          {view === 'analytics' && (
            <div className="rl-dashboard">
              <div className="rl-page-header"><div><div className="rl-page-title">TALENT ANALYTICS</div><div className="rl-page-sub">Evidence-based · Explainable · Ethical AI</div></div></div>
              <div className="rl-stats-grid">
                <StatCard label="Total Screened"    value="1,284" delta="This quarter"      accent="var(--color-teal)" />
                <StatCard label="Avg Time-to-Hire"  value="14.2d" delta="↓ 41% vs industry" accent="#22C55E" />
                <StatCard label="Offer Accept Rate" value="78%"   delta="↑ 12% this month"  accent="var(--color-teal)" />
                <StatCard label="Diversity Score"   value="82/100" delta="Balanced pipeline" accent="#22C55E" />
              </div>
              <div className="rl-two-col">
                <section className="rl-card">
                  <div className="rl-card-header"><div className="rl-card-title">SKILL DEMAND HEATMAP</div></div>
                  <div className="rl-heatmap">
                    {[{skill:'Python',demand:94},{skill:'SQL',demand:88},{skill:'AWS',demand:81},{skill:'Machine Learning',demand:76},{skill:'Kubernetes',demand:68},{skill:'Data Modelling',demand:63},{skill:'Scala / Spark',demand:57},{skill:'Terraform',demand:51}].map(s=>(
                      <div key={s.skill} className="rl-heatmap-row">
                        <span className="rl-heatmap-label">{s.skill}</span>
                        <div className="rl-heatmap-track"><div className="rl-heatmap-fill" style={{width:`${s.demand}%`,opacity:0.4+(s.demand/100)*0.6}}/></div>
                        <span className="rl-heatmap-pct">{s.demand}%</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rl-card">
                  <div className="rl-card-header"><div className="rl-card-title">PIPELINE FUNNEL</div></div>
                  <div className="rl-funnel">
                    {[{label:'Applications',n:1284,pct:100},{label:'AI Screened',n:847,pct:66},{label:'Shortlisted',n:312,pct:24},{label:'Interviewed',n:94,pct:7},{label:'Offers Made',n:28,pct:2}].map((s,i)=>(
                      <div key={s.label} className="rl-funnel-stage" style={{width:`${100-i*14}%`}}>
                        <span>{s.label}</span><strong>{s.n.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {view === 'settings' && (
            <div className="rl-dashboard">
              <div className="rl-page-header"><div><div className="rl-page-title">SETTINGS</div><div className="rl-page-sub">Manage your recruiter profile and preferences</div></div></div>
              <section className="rl-card" style={{maxWidth:560}}>
                <div className="rl-card-header"><div className="rl-card-title">ACCOUNT</div></div>
                <div className="rl-settings-row"><label>Name</label><span>{user.name}</span></div>
                <div className="rl-settings-row"><label>Email</label><span>{user.email}</span></div>
                <div className="rl-settings-row"><label>Role</label><span>Recruiter</span></div>
                <div style={{marginTop:'1.5rem'}}>
                  <button className="rl-cta-btn" onClick={onLogout}>SIGN OUT</button>
                </div>
              </section>
            </div>
          )}

        </main>

        <footer className="rl-footer">
          <span>AVA RECRUITER · TALENT INTELLIGENCE INFRASTRUCTURE</span>
          <span>AVA GUIDES — HUMAN DECIDES</span>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage
