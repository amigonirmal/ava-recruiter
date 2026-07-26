import { useState, useEffect, useRef, useCallback } from 'react'
import './LandingPage.css'
import { fetchJobs, postJob, fetchCandidates } from '../services/jobsApi'
import TalentHeatmap from './TalentHeatmap'

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

// ─── Matching Matrix View  ─────────────────────────────────────────────────────
// Layout follows the reference "Matching Matrix Command Center" HTML exactly.
// Colours: dark navy oklch palette, amber talent dots, teal/green accents.
const MatchingMatrixView = ({ job, onBack, onClose, candidatesData }) => {
  const [candidates, setCandidates]       = useState(candidatesData?.candidates    || [])
  const [scoreCriteria]                   = useState(candidatesData?.scoreCriteria || [])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [isClosed, setIsClosed]                   = useState(false)
  const [loading, setLoading]                     = useState(!candidatesData)
  const [showHCMT, setShowHCMT]                   = useState(false)

  // Fetch live candidate data from the API every time the matrix opens
  useEffect(() => {
    setLoading(true)
    fetchCandidates()
      .then(data => { setCandidates(data.candidates || []); setLoading(false) })
      .catch(err  => { console.error('fetchCandidates:', err); setLoading(false) })
  }, [])

  // ── helpers ──
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true })

  const acceptedCandidates = candidates.filter(c => c.jobApplicationStatus === 'accepted')
  const pendingCandidates  = candidates.filter(c => c.jobApplicationStatus === 'not_responded')
  const acceptedCount      = acceptedCandidates.length

  // Card visual style by status
  // accepted  → green border + glow
  // not_responded → grey/dimmed
  const cardStyle = (c) => {
    if (c.jobApplicationStatus === 'accepted') return {
      border:     '1px solid oklch(68% 0.18 145 / 0.9)',
      baseShadow: '0 0 14px oklch(65% 0.2 145 / 0.35)',
      ringColor:  'oklch(70% 0.17 145)',
      chartColor: 'oklch(70% 0.17 145)',
      nameColor:  'oklch(90% 0.06 145)',
      opacity:    1,
      isGreen:    true,
    }
    // not_responded — greyed out
    return {
      border:     '1px solid oklch(35% 0.04 250 / 0.5)',
      baseShadow: 'none',
      ringColor:  'oklch(38% 0.02 250)',
      chartColor: 'oklch(42% 0.03 250)',
      nameColor:  'oklch(52% 0.02 250)',
      opacity:    0.55,
      isGreen:    false,
    }
  }

  // Deterministic sparkline points from a seed
  const spark = (seed, up) => {
    let pts = [], y = 12
    for (let i = 0; i < 6; i++) {
      const x = Math.sin(seed + i) * 10000; const r = x - Math.floor(x)
      y += (r - (up ? 0.65 : 0.5)) * 6
      y = Math.max(2, Math.min(14, y))
      pts.push(`${i * 8},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }

  // Rating
  const rating = pct => pct >= 90 ? 'AA+' : pct >= 80 ? 'AA' : pct >= 70 ? 'A+' : pct >= 60 ? 'A' : 'B'

  // Pentagon radar for monitor panel
  const cx = 100, cy = 90
  const AXES = [-90, -18, 54, 126, 198]
  const toPt = (i, r) => { const a = AXES[i] * Math.PI / 180; return `${(cx + r * Math.cos(a)).toFixed(0)},${(cy + r * Math.sin(a)).toFixed(0)}` }
  const poolR    = [78, 62, 55, 22, 45]
  const targetR  = [60, 48, 40, 44, 40]
  const radarPool   = poolR.map((r,i)   => toPt(i,r)).join(' ')
  const radarTarget = targetR.map((r,i) => toPt(i,r)).join(' ')

  // Score bars for detail drawer
  const ScoreBar = ({ label, score, maxScore }) => {
    const pct = (score / maxScore) * 100
    const col = pct >= 80 ? 'oklch(70% 0.17 145)' : pct >= 60 ? 'oklch(68% 0.18 195)' : 'oklch(72% 0.15 80)'
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
        <span style={{ fontSize:9, color:'oklch(62% 0.02 250)', width:110, flexShrink:0 }}>{label}</span>
        <div style={{ flex:1, height:4, background:'oklch(22% 0.03 250)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:2 }}/>
        </div>
        <span style={{ fontSize:9, fontWeight:800, color:col, width:28, textAlign:'right' }}>{score}/{maxScore}</span>
      </div>
    )
  }

  const liveLine  = isClosed ? 'CLOSED: Position Filled' : 'LIVE: Underwriting Phase'
  const liveColor = isClosed ? 'oklch(65% 0.02 250)' : 'oklch(70% 0.17 145)'

  // Show full HCMT edit page when requested
  if (showHCMT) return (
    <HCMTView
      titleSuffix={(job?.title || 'ROLE').toUpperCase()}
      jobTitle={(job?.title || 'Senior Data Engineer').toUpperCase()}
      onBack={() => setShowHCMT(false)}
      actionLabel="SAVE & RETURN TO MATRIX"
      onAction={() => setShowHCMT(false)}
    />
  )

  return (
    <div className="mmc" style={{
      fontFamily: "'JetBrains Mono', 'Satoshi', ui-monospace, monospace",
      background: 'oklch(11% 0.02 250)',
      color: 'oklch(88% 0.02 250)',
      minHeight: 'calc(100vh - 120px)',
      display: 'flex', flexDirection: 'column',
      fontSize: 12,
    }}>

      {/* ── TOP CHROME BAR ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'oklch(14% 0.025 250)',
        borderBottom:'1px solid oklch(45% 0.16 195 / 0.4)',
        padding:'6px 14px', fontSize:11, letterSpacing:'0.08em',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="mm-back-btn-chrome" onClick={onBack}>← BACK</button>
          <span style={{ color:'oklch(72% 0.15 195)', fontWeight:700 }}>TALENT ACQUISITION (TA) COMMAND CENTER</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14, color:'oklch(65% 0.02 250)' }}>
          <span style={{ color:'oklch(85% 0.02 250)', fontWeight:700 }}>{dateStr}</span>
          <span style={{ color:'oklch(70% 0.15 195)', fontWeight:700 }}>{timeStr}</span>
        </div>
      </div>

      {/* ── REQUISITION BANNER ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
        background:'oklch(15% 0.028 250)',
        borderBottom:'1px solid oklch(45% 0.16 195 / 0.4)',
        padding:'12px 16px',
        boxShadow:'0 0 22px oklch(60% 0.22 195 / 0.12)',
        flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:28, fontWeight:800, color:'oklch(72% 0.15 80)', fontFamily:'serif' }}>A</span>
          <div>
            <div style={{ fontSize:'clamp(13px,1.3vw,17px)', fontWeight:800, color:'oklch(90% 0.05 145)', letterSpacing:'0.02em' }}>
              ACTIVE REQUISITION: <span style={{ color:'oklch(75% 0.02 250)' }}>{job?.title || 'Senior Data Engineer'}</span>
            </div>
            <div style={{ fontSize:11, color:'oklch(60% 0.02 250)', letterSpacing:'0.04em', marginTop:3 }}>
              {job?.dept && <span>{job.dept} · </span>}
              UNDERWRITING STANDARDS: Perf: 9.5, Comp: 2.0 &nbsp;·&nbsp;
              <span style={{ color:liveColor, fontWeight:700 }}>{liveLine}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {/* EDIT JD button — opens HCMTView */}
          <button
            className="mm-back-btn-chrome"
            style={{ color:'oklch(75% 0.15 80)', borderColor:'oklch(55% 0.12 80 / 0.6)', letterSpacing:'0.07em' }}
            onClick={() => setShowHCMT(true)}
          >
            ✎ EDIT JD
          </button>
          {/* filter tabs */}
          <div className="mmc-tabs">
            {['All','Accepted','Pending'].map(t => (
              <span key={t} className="mmc-tab">{t.toUpperCase()}</span>
            ))}
          </div>
          {!isClosed ? (
            <button className="mmc-close-btn" onClick={() => {
              if (window.confirm(`Close role "${job?.title}"? It will move to Closed Jobs.`)) {
                setIsClosed(true)
                onClose(job)
              }
            }}>
              ✕ CLOSE POSITION
            </button>
          ) : (
            <div className="mmc-filled-badge">
              ✓ POSITION FILLED
              <span className="mmc-reopen" onClick={() => setIsClosed(false)}>reopen</span>
            </div>
          )}
        </div>
      </div>

      {/* ── BODY: matrix + monitor ── */}
      <div style={{ display:'flex', flex:1 }}>

        {/* ── MATCHING MATRIX (centre) ── */}
        <div style={{ flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

          {/* Section header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div style={{ fontSize:13, fontWeight:800, letterSpacing:'0.04em', color:'oklch(90% 0.05 195)' }}>
              THE MATCHING MATRIX <span style={{ color:'oklch(58% 0.02 250)', fontWeight:500 }}>(INBOUND OPPORTUNITIES)</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:10, color:'oklch(65% 0.02 250)' }}>
              <span>⊞ GitHub</span><span>◆ Jira</span><span>ICAW</span>
              <span style={{ background:'oklch(20% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.5)', borderRadius:3, padding:'4px 8px', color:'oklch(80% 0.02 250)' }}>
                ALL: MATCH ↓
              </span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:10, letterSpacing:'0.05em', color:'oklch(58% 0.02 250)' }}>
            TOP MATCHING PROFILES
            {loading && (
              <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%',
                border:'2px solid oklch(45% 0.16 195 / 0.4)', borderTopColor:'oklch(72% 0.15 195)',
                animation:'spin 0.7s linear infinite' }}/>
            )}
          </div>

          {/* CARD GRID — 6 columns */}
          <div className="mmc-grid">
            {candidates.map((c, idx) => {
              const st = cardStyle(c)
              const isSelected = selectedCandidate?.id === c.id
              const seed = idx * 3
              // neon teal glow on selected; green ambient on accepted; nothing on grey
              const boxShadow = isSelected
                ? '0 0 0 2px #00e6d2, 0 0 18px #00e6d2, 0 0 36px rgba(0,230,210,0.45)'
                : st.baseShadow
              return (
                <div
                  key={c.id}
                  className="mmc-card"
                  style={{
                    border: st.border,
                    boxShadow,
                    opacity: st.opacity,
                    transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
                  }}
                  onClick={() => setSelectedCandidate(isSelected ? null : c)}
                >
                  {/* Avatar row */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div style={{
                      width:30, height:30, borderRadius:'50%',
                      border:`1.5px solid ${st.ringColor}`,
                      background:'oklch(22% 0.02 250)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:800,
                      color: st.isGreen ? 'oklch(88% 0.03 195)' : 'oklch(55% 0.02 250)',
                    }}>
                      {c.initials}
                    </div>
                    {/* status dot */}
                    <div style={{
                      width:7, height:7, borderRadius:'50%', marginTop:2,
                      background: st.isGreen ? 'oklch(68% 0.18 145)' : 'oklch(38% 0.03 250)',
                      boxShadow: st.isGreen ? '0 0 6px oklch(65% 0.2 145)' : 'none',
                    }}/>
                  </div>

                  {/* Name — always shown */}
                  <div>
                    <div style={{ fontSize:9.5, fontWeight:800, color: st.nameColor, lineHeight:1.25 }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize:8, color: st.chartColor, fontWeight:700, marginTop:1 }}>
                      {c.overallScorePercent}% · {rating(c.overallScorePercent)}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    fontSize:7, fontWeight:800, letterSpacing:'0.07em',
                    color: st.isGreen ? 'oklch(70% 0.17 145)' : 'oklch(44% 0.03 250)',
                    textTransform:'uppercase',
                  }}>
                    {st.isGreen ? '● ACCEPTED' : '○ PENDING'}
                  </div>

                  {/* Sparklines */}
                  <div style={{ marginTop:'auto', display:'flex', gap:5 }}>
                    <div style={{ flex:1 }}>
                      <svg viewBox="0 0 40 16" width="100%" height="14" preserveAspectRatio="none">
                        <polyline points={spark(seed+1, st.isGreen)} fill="none" stroke={st.chartColor} strokeWidth="1.5"/>
                      </svg>
                      <div style={{ fontSize:7, color:'oklch(44% 0.02 250)', letterSpacing:'0.03em' }}>VELOCITY</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <svg viewBox="0 0 40 16" width="100%" height="14" preserveAspectRatio="none">
                        <polyline points={spark(seed+2, true)} fill="none" stroke={st.chartColor} strokeWidth="1.5"/>
                      </svg>
                      <div style={{ fontSize:7, color:'oklch(44% 0.02 250)', letterSpacing:'0.03em' }}>SLOPE</div>
                    </div>
                  </div>

                  {/* Reveal CTA — accepted only */}
                  {st.isGreen && (
                    <div className="mmc-reveal" onClick={e => { e.stopPropagation(); setSelectedCandidate(c) }}>
                      REVEAL &amp; UNDERWRITE
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── BOTTOM ROW ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:8 }}>

            {/* Heatmap — React Leaflet */}
            <div className="mmc-panel">
              <div style={{ fontSize:11, fontWeight:800, color:'oklch(90% 0.05 195)' }}>TALENT SUPPLY HEATMAP</div>
              <div style={{ fontSize:9, color:'oklch(58% 0.02 250)', marginBottom:6 }}>AA+ talent clusters · live geo-distribution</div>
              <TalentHeatmap height="175px" />
            </div>

            {/* Volatility */}
            <div className="mmc-panel" style={{ display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'oklch(90% 0.05 195)' }}>VOLATILITY INDEX:</div>
              <div style={{ fontSize:11, fontWeight:800, color:'oklch(88% 0.03 195)' }}>KAFKA SKILLS</div>
              <div style={{ fontSize:10, color:'oklch(70% 0.17 145)', fontWeight:700, margin:'2px 0 8px' }}>(+14% [HIGH Demand])</div>
              <svg viewBox="0 0 200 90" width="100%" height="90" preserveAspectRatio="none" style={{ flex:1 }}>
                <polyline points="4,80 24,72 44,76 64,60 84,66 104,44 124,52 144,30 164,38 196,12"
                  fill="none" stroke="oklch(70% 0.17 145)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                <polyline points="4,80 24,72 44,76 64,60 84,66 104,44 124,52 144,30 164,38 196,12 196,90 4,90"
                  fill="oklch(70% 0.17 145 / 0.08)" stroke="none"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── INBOUND LIQUIDITY MONITOR (right) ── */}
        <div style={{
          width:240, flexShrink:0,
          background:'oklch(14% 0.025 250)',
          borderLeft:'1px solid oklch(45% 0.16 195 / 0.4)',
          padding:12,
          display:'flex', flexDirection:'column', gap:12,
          overflowY:'auto',
        }}>
          <div style={{ fontSize:12, fontWeight:800, letterSpacing:'0.03em', color:'oklch(90% 0.05 195)' }}>
            THE INBOUND LIQUIDITY MONITOR
          </div>

          {/* Acceptances pending */}
          <div className="mmc-panel">
            <div style={{ fontSize:10, fontWeight:800, color:'oklch(85% 0.03 195)' }}>ACCEPTANCES PENDING</div>
            <div style={{ fontSize:9, color:'oklch(58% 0.02 250)', marginBottom:8 }}>
              ({pendingCandidates.length} ACTIVE LEADS AWAITING OPT-IN)
            </div>
            <div style={{ display:'flex', gap:4, marginBottom:8 }}>
              {String(pendingCandidates.length).padStart(5,'0').split('').map((d,i) => (
                <div key={i} style={{
                  flex:1, textAlign:'center', fontSize:15, fontWeight:800,
                  color:'oklch(92% 0.03 195)',
                  background:'oklch(20% 0.03 250)',
                  border:'1px solid oklch(45% 0.16 195 / 0.4)',
                  borderRadius:3, padding:'5px 0',
                }}>{d}</div>
              ))}
            </div>
            <div style={{
              height:6, borderRadius:3,
              background:'linear-gradient(90deg, oklch(72% 0.15 195) 60%, oklch(75% 0.15 80) 60%)',
              boxShadow:'0 0 8px oklch(60% 0.2 195 / 0.5)',
            }}/>
          </div>

          {/* Acceptances received — pool */}
          <div className="mmc-panel" style={{ flex:1, display:'flex', flexDirection:'column' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'oklch(85% 0.03 195)' }}>ACCEPTANCES RECEIVED</div>
            <div style={{ fontSize:9, color:'oklch(58% 0.02 250)', marginBottom:8 }}>(THE ACTIVE POOL)</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'oklch(55% 0.02 250)', marginBottom:6 }}>
              <span>UNLOCKED PROFILE</span><span>MATCH CONFIDENCE</span>
            </div>
            {acceptedCount === 0 ? (
              <div style={{ fontSize:9, color:'oklch(52% 0.02 250)', fontStyle:'italic', paddingBottom:8 }}>
                No acceptances yet — candidates shown as pending
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {acceptedCandidates.slice(0,5).map((c,i) => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}
                    onClick={() => setSelectedCandidate(c)}>
                    <span style={{ fontSize:9, color:'oklch(58% 0.02 250)', width:8 }}>{i+1}</span>
                    <div style={{ width:16, height:16, borderRadius:'50%', background:'oklch(26% 0.02 250)', border:'1px solid oklch(50% 0.1 195 / 0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'oklch(75% 0.15 195)', fontWeight:800, flexShrink:0 }}>
                      {c.initials}
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, color:'oklch(88% 0.03 195)', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</span>
                    <div style={{ width:40, height:4, borderRadius:2, background:'oklch(26% 0.02 250)', overflow:'hidden' }}>
                      <div style={{ width:`${c.overallScorePercent}%`, height:'100%', background:'oklch(70% 0.17 145)' }}/>
                    </div>
                    <span style={{ fontSize:9, fontWeight:800, color:'oklch(72% 0.17 145)' }}>{c.overallScorePercent}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pentagon radar — Active Pool vs Target */}
            <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', fontSize:8 }}>
              <span style={{ color:'oklch(72% 0.17 145)', fontWeight:700 }}>Active Pool</span>
              <span style={{ color:'oklch(72% 0.15 80)', fontWeight:700 }}>Target Asset Shape</span>
            </div>
            <div style={{ flex:1, minHeight:150, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 200 180" width="100%" height="100%" style={{ maxHeight:180 }}>
                {/* Outer + inner pentagon grid */}
                <polygon points="100,15 180,68 150,165 50,165 20,68" fill="none" stroke="oklch(35% 0.04 250)" strokeWidth="1"/>
                <polygon points="100,50 145,85 128,133 72,133 55,85" fill="none" stroke="oklch(35% 0.04 250)" strokeWidth="1"/>
                {/* Axis lines */}
                {[[100,90,100,15],[100,90,180,68],[100,90,150,165],[100,90,50,165],[100,90,20,68]].map(([x1,y1,x2,y2],i)=>(
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(35% 0.04 250)" strokeWidth="1"/>
                ))}
                {/* Active pool shape */}
                <polygon points={radarPool} fill="oklch(68% 0.17 145 / 0.3)" stroke="oklch(70% 0.17 145)" strokeWidth="2" strokeLinejoin="round"/>
                {/* Target shape */}
                <polygon points={radarTarget} fill="oklch(72% 0.15 80 / 0.12)" stroke="oklch(72% 0.15 80 / 0.75)" strokeWidth="1.5" strokeLinejoin="round"/>
                {/* Labels */}
                {[['Perf Max',100,10],['Comp Min',190,66],['Perf Max',152,178],['Comp Min',46,178],['Comp Min',8,66]].map(([lbl,x,y])=>(
                  <text key={lbl+x} x={x} y={y} textAnchor="middle" fontSize="7" fill="oklch(70% 0.02 250)" fontFamily="'JetBrains Mono',monospace">{lbl}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Selected candidate detail drawer */}
          {selectedCandidate && (
            <div className="mmc-panel" style={{ fontSize:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontWeight:800, color:'oklch(90% 0.05 195)', fontSize:11 }}>{selectedCandidate.name}</span>
                <span style={{ cursor:'pointer', color:'oklch(60% 0.02 250)', fontSize:10 }}
                  onClick={() => setSelectedCandidate(null)}>✕</span>
              </div>
              <div style={{ fontSize:9, color:'oklch(65% 0.17 145)', marginBottom:8 }}>
                {selectedCandidate.currentOrganization.name} · {selectedCandidate.experience.relevantYears}yr relevant
              </div>
              <div style={{ marginBottom:8 }}>
                {selectedCandidate.scoreBreakdown.map(s => (
                  <ScoreBar key={s.criterion} label={s.label} score={s.score} maxScore={s.maxScore}/>
                ))}
              </div>
              <div style={{ fontSize:8.5, color:'oklch(60% 0.02 250)', lineHeight:1.5, marginBottom:8,
                borderLeft:'2px solid oklch(45% 0.16 195 / 0.4)', paddingLeft:6 }}>
                {selectedCandidate.justification}
              </div>
              <div style={{ fontSize:8.5, fontWeight:800, color:'oklch(72% 0.15 195)', marginBottom:4, letterSpacing:'0.06em' }}>
                INTERVIEW PROBES
              </div>
              {selectedCandidate.interviewProbes.map((p,i) => (
                <div key={i} style={{ display:'flex', gap:6, marginBottom:4 }}>
                  <span style={{ color:'oklch(70% 0.17 145)', fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ fontSize:8.5, color:'oklch(70% 0.02 250)', lineHeight:1.45 }}>{p}</span>
                </div>
              ))}
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                {selectedCandidate.technicalSkills.slice(0,8).map(s => (
                  <span key={s} style={{
                    fontSize:8, background:'oklch(20% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.4)',
                    borderRadius:3, padding:'2px 5px', color:'oklch(65% 0.14 195)',
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Human Capital Market Terminal (HCMT) ─────────────────────────────────────
const APP_FONT = "var(--font-brand)"

// ── 5 scoring criteria (matching candidates_final.json scoreCriteria) ─────────
const HCMT_CRITERIA = [
  { key: 'pipeline',    label: 'Pipeline Architecture', short: 'PIPELINE', color: 'oklch(70% 0.17 145)' },
  { key: 'scalability', label: 'Scalability',           short: 'SCALE',    color: 'oklch(72% 0.15 195)' },
  { key: 'gov',         label: 'Data Governance',       short: 'GOV',      color: 'oklch(70% 0.15 195)' },
  { key: 'sovereignty', label: 'Data Sovereignty',      short: 'SOVR',     color: 'oklch(75% 0.13 80)'  },
  { key: 'privacy',     label: 'Privacy Engineering',   short: 'PRIVACY',  color: 'oklch(65% 0.2 25)'   },
]

// ── Pentagon radar — driven purely by pct values (0-100) ─────────────────────
const HCMTRadar = ({ values }) => {
  // values: array of 0–100 matching HCMT_CRITERIA order
  const cx = 100, cy = 90, maxR = 70
  const ANGLES = [-90, -18, 54, 126, 198]
  const toPt = (ang, r) => {
    const a = ang * Math.PI / 180
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }
  const outer    = ANGLES.map(a => toPt(a, maxR))
  const inner    = ANGLES.map(a => toPt(a, maxR * 0.5))
  const dataPts  = ANGLES.map((a, i) => toPt(a, maxR * ((values[i] ?? 0) / 100)))
  const labelPts = ANGLES.map(a => toPt(a, maxR + 18))
  const poly     = pts => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox="0 0 200 185" width="100%" style={{ maxHeight: 200 }}>
      <polygon points={poly(outer)} fill="none" stroke="oklch(40% 0.04 250)" strokeWidth="1"/>
      <polygon points={poly(inner)} fill="none" stroke="oklch(40% 0.04 250)" strokeWidth="1"/>
      {ANGLES.map((a, i) => {
        const o = toPt(a, maxR)
        return <line key={i} x1={cx} y1={cy} x2={o.x.toFixed(1)} y2={o.y.toFixed(1)} stroke="oklch(40% 0.04 250)" strokeWidth="1"/>
      })}
      <polygon points={poly(dataPts)}
        fill="oklch(68% 0.17 145 / 0.22)" stroke="oklch(70% 0.17 145)"
        strokeWidth="2" strokeLinejoin="round"/>
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5"
          fill={HCMT_CRITERIA[i].color} opacity="0.9"/>
      ))}
      {HCMT_CRITERIA.map((c, i) => (
        <text key={i} x={labelPts[i].x.toFixed(1)} y={labelPts[i].y.toFixed(1)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="7.5" fill="oklch(72% 0.02 250)" fontFamily={APP_FONT}
          fontWeight="700">{c.short}</text>
      ))}
    </svg>
  )
}

// ── JDVisualView — shown from PostJobView after uploading a JD file ───────────
// Uses the same HCMTView shell but in "post" mode with a file name in the title.
const JDVisualView = ({ file, onPost, onBack }) => {
  return (
    <HCMTView
      titleSuffix={file?.name?.toUpperCase().replace(/\.[^.]+$/, '') || 'JD UPLOAD'}
      jobTitle="SENIOR CLOUD DATA ENGINEER"
      onBack={onBack}
      actionLabel="POST ROLE & START MATCHING"
      onAction={onPost}
    />
  )
}

// ── HCMTView — the full interactive HCMT page ─────────────────────────────────
// Props:
//   titleSuffix  string shown in the top-right of the title bar
//   jobTitle     string for the TICKER row
//   onBack       () => void
//   actionLabel  string for the primary CTA (default "SAVE CHANGES")
//   onAction     () => void  (called when CTA is pressed)
const HCMTView = ({ titleSuffix = '', jobTitle, onBack, actionLabel = 'SAVE CHANGES', onAction }) => {
  const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()

  // ── Live slider state — one value (0–10) per criterion ────────────────
  const [sliderVals, setSliderVals] = useState(
    Object.fromEntries(HCMT_CRITERIA.map(c => [c.key, c.key === 'privacy' ? 2 : c.key === 'sovereignty' ? 10 : c.key === 'pipeline' ? 9 : 6]))
  )
  const setVal = (key, v) => setSliderVals(prev => ({ ...prev, [key]: v }))

  // pct for radar (0-100)
  const radarValues = HCMT_CRITERIA.map(c => (sliderVals[c.key] / 10) * 100)

  // Derived tag label from value
  const tag = v => v >= 9 ? '[MAX]' : v >= 7 ? '[HIGH]' : v >= 5 ? '[MODERATE]' : v >= 3 ? '[LOW]' : '[MIN]'

  const matchPool = 18
  const compRange = '£150k – £195k'

  // ── Shared panel styles ────────────────────────────────────────────────
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
  const sectionPad = { padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }
  const label12 = { fontSize: 12, fontWeight: 700, color: 'oklch(88% 0.02 195)', letterSpacing: '0.03em' }

  return (
    <div style={{
      fontFamily: APP_FONT,
      background: 'oklch(13% 0.025 250)',
      color: 'oklch(90% 0.02 145)',
      padding: 'clamp(10px,1.5vw,20px)',
      display: 'flex', flexDirection: 'column', gap: 12,
      borderRadius: 8,
    }}>

      {/* TITLE BAR */}
      <div style={{ ...panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ letterSpacing: '0.25em', fontSize: 11, color: 'oklch(55% 0.02 250)' }}>▤▤▤</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'oklch(85% 0.02 250)' }}>
          HUMAN CAPITAL MARKET TERMINAL (HCMT) — AVA RECRUITER
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {titleSuffix && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(70% 0.15 195)' }}>
              {titleSuffix}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'oklch(55% 0.02 250)', letterSpacing: '0.15em' }}>▤ _ ▢ ✕</span>
        </div>
      </div>

      {/* TICKER */}
      <div style={{ ...panel, padding: '14px 18px', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(13px,1.4vw,20px)', fontWeight: 800, letterSpacing: '0.04em', color: 'oklch(90% 0.02 195)' }}>
            TICKER:
          </span>
          <span style={{
            fontSize: 'clamp(13px,1.4vw,20px)', fontWeight: 800, letterSpacing: '0.04em',
            color: 'oklch(20% 0.03 250)', background: 'oklch(72% 0.15 80)',
            boxShadow: '0 0 14px oklch(72% 0.18 80 / 0.6)',
            borderRadius: 3, padding: '2px 10px',
          }}>AVA: SDE-CLOUD</span>
          <span style={{ fontSize: 'clamp(13px,1.4vw,20px)', fontWeight: 800, letterSpacing: '0.03em', color: 'oklch(70% 0.15 195)' }}>
            {jobTitle || 'SENIOR DATA ENGINEER'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12, letterSpacing: '0.03em' }}>
          <div><span style={{ color: 'oklch(90% 0.02 195)', fontWeight: 700 }}>ASSET CLASS:</span> <span style={{ color: 'oklch(75% 0.02 250)' }}>HUMAN CAPITAL: DATA ENG.</span></div>
          <div><span style={{ color: 'oklch(90% 0.02 195)', fontWeight: 700 }}>ISSUE DATE:</span> <span style={{ color: 'oklch(75% 0.02 250)' }}>{today}</span></div>
          <div><span style={{ color: 'oklch(90% 0.02 195)', fontWeight: 700 }}>STATUS: </span><span style={{ color: 'oklch(70% 0.17 145)', fontWeight: 700 }}>ACTIVE BUY ORDER (HIRING)</span></div>
        </div>
      </div>

      {/* MAIN 3-COLUMN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 12, alignItems: 'stretch' }}>

        {/* COL 1 — COMPETENCY VECTORS with LIVE SLIDERS */}
        <section style={panel}>
          <div style={panelHead}>
            <span style={panelTitle}>PARAMETRIC BUY ORDER — COMPETENCY VECTORS</span>
          </div>
          <div style={sectionPad}>
            {HCMT_CRITERIA.map(c => {
              const val = sliderVals[c.key]
              const pct = (val / 10) * 100
              return (
                <div key={c.key}>
                  {/* Label row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'oklch(88% 0.02 195)', letterSpacing: '0.02em' }}>
                      {c.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: c.color, minWidth: 32, textAlign: 'right' }}>
                        {val.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.color }}>{tag(val)}</span>
                    </div>
                  </div>

                  {/* Native range slider — styled via CSS class hcmt-slider */}
                  <input
                    type="range"
                    className="hcmt-slider"
                    min="0" max="10" step="0.5"
                    value={val}
                    onChange={e => setVal(c.key, parseFloat(e.target.value))}
                    style={{ '--slider-color': c.color, '--slider-pct': `${pct}%` }}
                  />

                  {/* Visual track (mirrors slider position) */}
                  <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'oklch(26% 0.02 250)', marginTop: 4 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 2, background: c.color, transition: 'width 0.1s' }}/>
                    <div style={{
                      position: 'absolute', top: '50%', left: `${pct}%`,
                      width: 12, height: 12, borderRadius: '50%',
                      background: c.color,
                      boxShadow: `0 0 8px ${c.color}`,
                      transform: 'translate(-50%,-50%)',
                      transition: 'left 0.1s',
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* COL 2 — RADAR (live-updates with sliders) */}
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
            <div style={{ height: 1, background: 'oklch(32% 0.03 250)' }}/>
            <div>
              <div style={label12}>EST. TOTAL COMP RANGE:</div>
              <div style={{ fontSize: 'clamp(18px,2vw,26px)', fontWeight: 800, color: 'oklch(70% 0.15 195)', marginTop: 4, textShadow: '0 0 16px oklch(60% 0.2 195 / 0.5)' }}>{compRange}</div>
              <div style={{ fontSize: 9, color: 'oklch(55% 0.02 250)', letterSpacing: '0.08em', marginTop: 2 }}>INDEXED TO SCORE TICKER</div>
            </div>
            {/* Radar — updates live with sliders */}
            <div style={{ background: 'oklch(15% 0.025 250)', border: '1px solid oklch(45% 0.16 195 / 0.35)', borderRadius: 4, padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(70% 0.02 250)', marginBottom: 6 }}>TARGET PROFILE SHAPE</div>
              <div style={{ flex: 1, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HCMTRadar values={radarValues} />
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
          </div>
          <div style={{ ...sectionPad, gap: 12 }}>
            {[
              { mark: '✓', ok: true,  title: '[[GITHUB]] COMMITS',      desc: 'PERF OPTIMIZATION, CACHING' },
              { mark: '✓', ok: true,  title: '[[JIRA]] ROLE',           desc: 'TECH LEAD, SCALE MIGRATIONS' },
              { mark: '✓', ok: true,  title: '[[CLOUD CERT.]]',         desc: 'AWS ARCHITECT, PERFORMANCE SPECIALIST' },
              { mark: '⊗', ok: false, title: '[DISABLED] [HIPAA/GDPR]', desc: 'GDPR ENVIRONMENT · *MIN PRIVACY REQUIREMENT' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: p.ok ? 1 : 0.6 }}>
                <span style={{
                  width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 3, marginTop: 1, fontSize: 12, fontWeight: 800,
                  border: p.ok ? '1px solid oklch(60% 0.15 145 / 0.7)' : '1px solid oklch(35% 0.03 250)',
                  color: p.ok ? 'oklch(70% 0.17 145)' : 'oklch(55% 0.02 250)',
                }}>{p.mark}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: p.ok ? 'oklch(88% 0.02 195)' : 'oklch(58% 0.02 250)' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: p.ok ? 'oklch(72% 0.02 250)' : 'oklch(48% 0.02 250)', marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                </div>
              </div>
            ))}

            {/* Live score summary */}
            <div style={{ marginTop: 8, background: 'oklch(15% 0.025 250)', border: '1px solid oklch(45% 0.16 195 / 0.3)', borderRadius: 4, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(70% 0.02 250)', marginBottom: 8 }}>CURRENT VECTOR WEIGHTS</div>
              {HCMT_CRITERIA.map(c => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: 'oklch(62% 0.02 250)', width: 110, flexShrink: 0 }}>{c.label}</span>
                  <div style={{ flex: 1, height: 3, background: 'oklch(22% 0.02 250)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(sliderVals[c.key] / 10) * 100}%`, height: '100%', background: c.color, borderRadius: 2, transition: 'width 0.1s' }}/>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: c.color, width: 22, textAlign: 'right' }}>{sliderVals[c.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ACTION ROW */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button className="rl-back-btn" onClick={onBack} style={{ fontFamily: APP_FONT }}>← BACK TO MATRIX</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="rl-pulse"/>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: 'oklch(55% 0.02 250)', fontFamily: APP_FONT }}>
            {HCMT_CRITERIA.length} COMPETENCY VECTORS ACTIVE — RADAR UPDATING LIVE
          </span>
        </div>
        <button className="rl-cta-btn" onClick={onAction} style={{ fontFamily: APP_FONT }}>
          {actionLabel}
        </button>
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


// ─── CV Profile Visualizer ────────────────────────────────────────────────────
// Upload a CV → animated processing state → full visual profile with:
//   radar chart · skill bars · experience timeline · education · keyword cloud
//   score ring · stat strip · certifications / languages
const CVProfileView = ({ onBack }) => {
  const [phase, setPhase]           = useState('upload')   // 'upload' | 'processing' | 'profile'
  const [dragOver, setDragOver]     = useState(false)
  const [fileName, setFileName]     = useState('')
  const [steps, setSteps]           = useState([])
  const fileInputRef                = useRef(null)

  const PROCESSING_STEPS = [
    'Extracting text from document…',
    'Parsing personal information…',
    'Identifying experience & tenure…',
    'Scoring technical skills…',
    'Building competency radar…',
    'Generating visual profile…',
  ]

  const startProcessing = (file) => {
    setFileName(file.name)
    setPhase('processing')
    setSteps([])
    PROCESSING_STEPS.forEach((s, i) => {
      setTimeout(() => {
        setSteps(prev => [...prev, s])
        if (i === PROCESSING_STEPS.length - 1) {
          setTimeout(() => setPhase('profile'), 600)
        }
      }, i * 380 + 200)
    })
  }

  const handleCVDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (file) startProcessing(file)
  }, [])

  const handleCVFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) startProcessing(file)
  }

  // ── Simulated parsed CV data ─────────────────────────────────────────────
  const profile = {
    name:       'Alexandra Thornton',
    initials:   'AT',
    headline:   'Senior Cloud Data Engineer · 9 yrs experience · London, UK',
    email:      'a.thornton@email.com',
    location:   'London, United Kingdom',
    linkedin:   'linkedin.com/in/athornton',
    score:      87,
    rating:     'AA+',
    totalYears: 9,
    relevantYrs: 7,
    roles:      3,
    tags:       ['Available Immediately', 'Open to Relocation', 'Python', 'GCP', 'Kafka'],
    skills: [
      { name: 'Apache Kafka',           pct: 94, color: 'var(--color-teal)' },
      { name: 'Python / PySpark',       pct: 91, color: 'var(--color-teal)' },
      { name: 'Google Cloud (GCP)',     pct: 88, color: 'var(--color-teal)' },
      { name: 'dbt / Data Modelling',   pct: 82, color: '#22C55E' },
      { name: 'SQL / BigQuery',         pct: 89, color: 'var(--color-teal)' },
      { name: 'Terraform / IaC',        pct: 76, color: '#7C3AED' },
      { name: 'Airflow / Prefect',      pct: 80, color: '#F59E0B' },
      { name: 'Leadership / Mentoring', pct: 65, color: '#F59E0B' },
    ],
    radar: [
      { label: 'PERFORMANCE',  pct: 95 },
      { label: 'ARCHITECTURE', pct: 82 },
      { label: 'ADAPTABILITY', pct: 88 },
      { label: 'COMPLIANCE',   pct: 20 },
      { label: 'LEADERSHIP',   pct: 65 },
    ],
    experience: [
      {
        title:   'Senior Data Engineer',
        company: 'FinTech Dynamics Ltd',
        date:    '2021 – Present',
        desc:    'Led migration of 40TB data warehouse to GCP BigQuery. Built real-time Kafka streaming pipelines processing 2M events/day. Reduced query latency by 62% via Spark optimisation.',
      },
      {
        title:   'Data Engineer',
        company: 'Barclays Technology',
        date:    '2018 – 2021',
        desc:    'Designed and maintained ETL pipelines for regulatory reporting (MiFID II). Implemented dbt models reducing pipeline run time from 4hr to 45min.',
      },
      {
        title:   'Junior Data Analyst',
        company: 'Accenture UK',
        date:    '2015 – 2018',
        desc:    'SQL-heavy analytics for retail clients. Built Tableau dashboards consumed by C-suite. Introduced Python automation saving 12hr/week manual work.',
      },
    ],
    education: [
      { degree: 'MSc Computer Science', school: 'University of Edinburgh',  year: '2015', icon: '🎓' },
      { degree: 'BSc Mathematics',      school: 'University of Manchester', year: '2013', icon: '📐' },
    ],
    certs: [
      'Google Cloud Professional Data Engineer',
      'AWS Certified Solutions Architect – Associate',
      'Confluent Certified Developer (Kafka)',
    ],
    languages: ['English (Native)', 'French (Conversational)'],
    keywords: [
      'Kafka','Python','PySpark','BigQuery','dbt','Terraform','Airflow',
      'GCP','AWS','Spark','SQL','Data Modelling','ETL','Streaming',
      'MiFID II','GDPR','CI/CD','Docker','Kubernetes','GitHub Actions',
    ],
  }

  // ── Pentagon radar SVG ─────────────────────────────────────────────────
  const CvpRadar = ({ axes }) => {
    const rcx = 100, rcy = 90, maxR = 68
    const radarAngles = [-90, -18, 54, 126, 198]
    const toPt = (ang, r) => {
      const a = ang * Math.PI / 180
      return { x: rcx + r * Math.cos(a), y: rcy + r * Math.sin(a) }
    }
    const outer = radarAngles.map(a => toPt(a, maxR))
    const inner = radarAngles.map(a => toPt(a, maxR * 0.5))
    const data  = axes.map((ax, i) => toPt(radarAngles[i], maxR * (ax.pct / 100)))
    const lbl   = axes.map((ax, i) => toPt(radarAngles[i], maxR + 18))
    const poly  = pts => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    return (
      <svg viewBox="0 0 200 195" width="100%" height="100%" style={{ maxHeight: 195 }}>
        <polygon points={poly(outer)} fill="none" stroke="var(--color-black-border)" strokeWidth="1"/>
        <polygon points={poly(inner)} fill="none" stroke="var(--color-black-border)" strokeWidth="1"/>
        {radarAngles.map((a, i) => {
          const o = toPt(a, maxR)
          return <line key={i} x1={rcx} y1={rcy} x2={o.x.toFixed(1)} y2={o.y.toFixed(1)} stroke="var(--color-black-border)" strokeWidth="1"/>
        })}
        <polygon points={poly(data)} fill="rgba(0,230,210,0.18)" stroke="var(--color-teal)" strokeWidth="2" strokeLinejoin="round"/>
        {data.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--color-teal)" opacity="0.9"/>)}
        {axes.map((ax, i) => (
          <text key={i} x={lbl[i].x.toFixed(1)} y={lbl[i].y.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="7.5" fill="var(--color-text-secondary)" fontFamily="var(--font-brand)"
            fontWeight="700" letterSpacing="0.05em">{ax.label}</text>
        ))}
      </svg>
    )
  }

  // ── Circular score ring ────────────────────────────────────────────────
  const scoreR = 36, scoreCirc = 2 * Math.PI * scoreR
  const scoreDash = (scoreCirc * profile.score / 100).toFixed(1)

  // ── Upload phase ─────────────────────────────────────────────────────
  if (phase === 'upload') return (
    <div className="cvp-root">
      <div className="cvp-chrome">
        <span className="cvp-chrome-title">CV PROFILE VISUALIZER — AVA INTELLIGENCE</span>
        <div className="cvp-chrome-meta">
          <span className="rl-pulse" />
          <span>AVA GUIDES — HUMAN DECIDES</span>
          <button className="rl-back-btn" style={{ marginLeft:'1rem' }} onClick={onBack}>← BACK</button>
        </div>
      </div>
      <div
        className={`cvp-upload-panel${dragOver ? ' dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleCVDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt"
          style={{ display:'none' }} onChange={handleCVFileInput} />
        <div className="cvp-upload-icon">📄</div>
        <div className="cvp-upload-title">DROP A CV TO VISUALISE</div>
        <div className="cvp-upload-sub">
          AVA will extract skills, experience, education and scoring vectors — and render a full visual talent profile in seconds.
        </div>
        <div className="cvp-upload-formats">
          {['PDF','DOCX','DOC','TXT'].map(f => <span key={f} className="cvp-fmt-chip">{f}</span>)}
        </div>
        <button className="rl-cta-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
          CHOOSE CV FILE
        </button>
      </div>
      <div className="cvp-stat-strip">
        {[
          { val:'94%', lbl:'EXTRACTION ACCURACY' },
          { val:'<3s', lbl:'PROCESSING TIME'     },
          { val:'20+', lbl:'SIGNAL DIMENSIONS'   },
          { val:'AA+', lbl:'TALENT RATING'        },
        ].map(s => (
          <div key={s.lbl} className="cvp-stat-cell">
            <div className="cvp-stat-val">{s.val}</div>
            <div className="cvp-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Processing phase ──────────────────────────────────────────────────
  if (phase === 'processing') return (
    <div className="cvp-root">
      <div className="cvp-chrome">
        <span className="cvp-chrome-title">CV PROFILE VISUALIZER — PROCESSING</span>
        <div className="cvp-chrome-meta"><span className="rl-pulse" /><span>{fileName}</span></div>
      </div>
      <div className="cvp-processing">
        <div className="cvp-processing-spinner" />
        <div className="cvp-processing-title">AVA IS ANALYSING THE CV</div>
        <div className="cvp-processing-sub">
          Extracting signals across {profile.radar.length} competency dimensions…
        </div>
        <div className="cvp-processing-bar-wrap">
          <div className="cvp-processing-bar" />
        </div>
        <div className="cvp-processing-steps">
          {PROCESSING_STEPS.map((s, i) => (
            <div key={i} className={`cvp-processing-step${steps.includes(s) ? ' done' : ''}`}>
              <span className="cvp-step-check">{steps.includes(s) ? '✓' : '○'}</span>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Profile phase ─────────────────────────────────────────────────────
  return (
    <div className="cvp-root">
      <div className="cvp-chrome">
        <span className="cvp-chrome-title">CV PROFILE — {profile.name.toUpperCase()}</span>
        <div className="cvp-chrome-meta">
          <span style={{ color:'var(--color-teal)', fontWeight:700 }}>✓ ANALYSIS COMPLETE</span>
          <span>·</span>
          <span>{fileName || 'cv_upload.pdf'}</span>
          <button className="rl-back-btn" style={{ marginLeft:'0.75rem' }} onClick={onBack}>← BACK</button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="cvp-stat-strip">
        <div className="cvp-stat-cell"><div className="cvp-stat-val">{profile.totalYears}yr</div><div className="cvp-stat-lbl">TOTAL EXPERIENCE</div></div>
        <div className="cvp-stat-cell"><div className="cvp-stat-val">{profile.relevantYrs}yr</div><div className="cvp-stat-lbl">RELEVANT EXP.</div></div>
        <div className="cvp-stat-cell"><div className="cvp-stat-val">{profile.roles}</div><div className="cvp-stat-lbl">ROLES HELD</div></div>
        <div className="cvp-stat-cell"><div className="cvp-stat-val" style={{ color:'#22C55E' }}>{profile.rating}</div><div className="cvp-stat-lbl">TALENT RATING</div></div>
      </div>

      <div className="cvp-profile-grid">
        {/* ── LEFT: Identity card ── */}
        <div className="cvp-identity">
          <div className="cvp-avatar">{profile.initials}</div>
          <div className="cvp-name">{profile.name}</div>
          <div className="cvp-headline">{profile.headline}</div>

          {/* Score ring */}
          <div className="cvp-score-ring">
            <svg viewBox="0 0 90 90" width="90" height="90">
              <circle cx="45" cy="45" r={scoreR} fill="none" stroke="var(--color-black-border)" strokeWidth="7"/>
              <circle cx="45" cy="45" r={scoreR} fill="none"
                stroke="var(--color-teal)" strokeWidth="7"
                strokeDasharray={`${scoreDash} ${scoreCirc}`}
                strokeLinecap="round"
                transform="rotate(-90 45 45)"
              />
            </svg>
            <div className="cvp-score-ring-label">
              <span className="cvp-score-ring-val">{profile.score}</span>
              <span className="cvp-score-ring-sub">SCORE</span>
            </div>
          </div>

          <div className="cvp-tag-row">
            {profile.tags.map(t => (
              <span key={t} className={`cvp-tag${['Python','GCP','Kafka'].includes(t)?' cvp-tag--teal':''}`}>{t}</span>
            ))}
          </div>

          <div className="cvp-contact-list">
            <div className="cvp-contact-row">
              <svg className="cvp-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
              {profile.email}
            </div>
            <div className="cvp-contact-row">
              <svg className="cvp-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {profile.location}
            </div>
            <div className="cvp-contact-row">
              <svg className="cvp-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              {profile.linkedin}
            </div>
          </div>

          <div style={{ width:'100%', textAlign:'left' }}>
            <div style={{ fontSize:'0.58rem', fontWeight:800, letterSpacing:'0.12em', color:'var(--color-text-muted)', marginBottom:'0.4rem' }}>CERTIFICATIONS</div>
            <div className="cvp-badge-list">
              {profile.certs.map(c => <div key={c} className="cvp-badge"><span className="cvp-badge-dot"/>{c}</div>)}
            </div>
          </div>

          <div style={{ width:'100%', textAlign:'left' }}>
            <div style={{ fontSize:'0.58rem', fontWeight:800, letterSpacing:'0.12em', color:'var(--color-text-muted)', marginBottom:'0.4rem' }}>LANGUAGES</div>
            <div className="cvp-badge-list">
              {profile.languages.map(l => <div key={l} className="cvp-badge"><span className="cvp-badge-dot"/>{l}</div>)}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Content panels ── */}
        <div className="cvp-panels">
          {/* Charts row */}
          <div className="cvp-charts-row">
            <div className="cvp-card">
              <div className="cvp-card-header">
                <span className="cvp-card-title">COMPETENCY RADAR</span>
                <span style={{ fontSize:'0.56rem', color:'var(--color-teal)', fontWeight:700 }}>5 VECTORS</span>
              </div>
              <div className="cvp-card-body" style={{ display:'flex', justifyContent:'center', height:200 }}>
                <CvpRadar axes={profile.radar} />
              </div>
            </div>

            <div className="cvp-card">
              <div className="cvp-card-header">
                <span className="cvp-card-title">TECHNICAL SKILLS</span>
                <span style={{ fontSize:'0.56rem', color:'var(--color-text-muted)' }}>{profile.skills.length} SIGNALS</span>
              </div>
              <div className="cvp-card-body">
                {profile.skills.map(s => (
                  <div key={s.name} className="cvp-skill-row">
                    <span className="cvp-skill-name">{s.name}</span>
                    <div className="cvp-skill-track">
                      <div className="cvp-skill-fill" style={{ width:`${s.pct}%`, background:s.color }}/>
                    </div>
                    <span className="cvp-skill-pct" style={{ color:s.color }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cvp-card">
              <div className="cvp-card-header">
                <span className="cvp-card-title">PERFORMANCE TREND</span>
                <span style={{ fontSize:'0.56rem', color:'#22C55E', fontWeight:700 }}>↑ +14% YOY</span>
              </div>
              <div className="cvp-card-body" style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div>
                  <svg viewBox="0 0 180 36" width="100%" height="48" preserveAspectRatio="none">
                    <polyline points="4,28 20,22 36,18 52,24 68,12 84,8 100,10 116,6 132,14 148,4 164,8 176,2"
                      fill="none" stroke="var(--color-teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="4,28 20,22 36,18 52,24 68,12 84,8 100,10 116,6 132,14 148,4 164,8 176,2 176,36 4,36"
                      fill="rgba(0,230,210,0.1)" stroke="none"/>
                  </svg>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--color-text-muted)' }}>
                    <span>2015</span><span>2019</span><span>2024</span>
                  </div>
                </div>
                {profile.radar.map(ax => (
                  <div key={ax.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:'0.58rem', color:'var(--color-text-muted)', width:90, flexShrink:0 }}>{ax.label}</span>
                    <div style={{ flex:1, height:4, background:'var(--color-black-light)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${ax.pct}%`, height:'100%', borderRadius:2,
                        background: ax.pct>=80?'var(--color-teal)':ax.pct>=60?'#F59E0B':'#FF3B4E' }}/>
                    </div>
                    <span style={{ fontSize:'0.58rem', fontWeight:700, width:28, textAlign:'right', color:'var(--color-teal)' }}>{ax.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Experience timeline */}
          <div className="cvp-card">
            <div className="cvp-card-header">
              <span className="cvp-card-title">EXPERIENCE TIMELINE</span>
              <span style={{ fontSize:'0.56rem', color:'var(--color-text-muted)' }}>{profile.experience.length} ROLES · {profile.totalYears} YRS</span>
            </div>
            <div className="cvp-card-body">
              <div className="cvp-timeline">
                {profile.experience.map((e, i) => (
                  <div key={i} className="cvp-tl-item">
                    <div className="cvp-tl-dot"/>
                    <div className="cvp-tl-date">{e.date}</div>
                    <div className="cvp-tl-title">{e.title}</div>
                    <div className="cvp-tl-company">{e.company}</div>
                    <div className="cvp-tl-desc">{e.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Education + Keywords */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div className="cvp-card">
              <div className="cvp-card-header"><span className="cvp-card-title">EDUCATION</span></div>
              <div className="cvp-card-body">
                <div className="cvp-edu-list">
                  {profile.education.map((e, i) => (
                    <div key={i} className="cvp-edu-item">
                      <div className="cvp-edu-icon">{e.icon}</div>
                      <div>
                        <div className="cvp-edu-degree">{e.degree}</div>
                        <div className="cvp-edu-school">{e.school}</div>
                        <div className="cvp-edu-year">{e.year}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cvp-card">
              <div className="cvp-card-header">
                <span className="cvp-card-title">KEYWORD SIGNALS</span>
                <span style={{ fontSize:'0.56rem', color:'var(--color-text-muted)' }}>{profile.keywords.length} DETECTED</span>
              </div>
              <div className="cvp-card-body">
                <div className="cvp-chips">
                  {profile.keywords.map(k => (
                    <span key={k} className={`cvp-chip${['Kafka','Python','GCP','BigQuery','dbt'].includes(k)?' cvp-chip--highlight':''}`}>{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="cvp-action-bar">
            <div style={{ fontSize:'0.62rem', color:'var(--color-text-muted)' }}>
              <span className="rl-pulse" style={{ marginRight:'0.4rem' }}/>
              AVA confidence: <strong style={{ color:'var(--color-teal)' }}>{profile.score}/100</strong> · Rating: <strong style={{ color:'#22C55E' }}>{profile.rating}</strong>
            </div>
            <div className="cvp-action-group">
              <button className="rl-ghost-btn" onClick={onBack}>← BACK</button>
              <button className="rl-cta-btn">SHORTLIST CANDIDATE</button>
              <button className="rl-cta-btn" style={{ background:'rgba(245,158,11,0.12)', borderColor:'rgba(245,158,11,0.4)', color:'#F59E0B' }}>
                SCHEDULE INTERVIEW
              </button>
            </div>
          </div>
        </div>
      </div>
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
            {view === 'cv-profile' && 'CV PROFILE VISUALIZER'}
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
                <button className="rl-cta-btn" onClick={() => setView('cv-profile')}>+ UPLOAD CV</button>
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
          {view === 'matches'    && <MatchingMatrixView job={selectedJob} onBack={() => setView('jobs')} onClose={handleCloseJob} />}
          {view === 'cv-profile' && <CVProfileView onBack={() => setView('candidates')} />}

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
