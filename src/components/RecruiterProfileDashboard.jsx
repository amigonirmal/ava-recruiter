import { useMemo, useState } from 'react'

const CARD = {
  background: 'oklch(17% 0.03 250)',
  border: '1px solid oklch(45% 0.16 195 / 0.45)',
  borderRadius: 6,
  padding: 18,
  boxShadow: '0 0 0 1px oklch(60% 0.2 195 / 0.10), 0 0 24px oklch(60% 0.22 195 / 0.18)',
}
const COLUMN = { display: 'flex', flexDirection: 'column', gap: 14 }
const DIVIDER = { height: 1, background: 'oklch(28% 0.03 250)', margin: '14px 0' }
const SECTION_TITLE = { fontSize: 10, letterSpacing: '0.1em', fontWeight: 800, color: 'oklch(90% 0.005 250)', textTransform: 'uppercase' }
const LABEL_SM = { fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'oklch(55% 0.02 250)', textTransform: 'uppercase' }
const TEAL = 'oklch(70% 0.19 195)'
const GREEN = 'oklch(68% 0.17 145)'

const COMPETENCY_CRITERIA = [
  { key: 'pipeline_architecture', label: 'Pipeline Architecture', short: 'PIPELINE', color: 'oklch(70% 0.17 145)' },
  { key: 'scalability', label: 'Scalability', short: 'SCALE', color: 'oklch(72% 0.15 195)' },
  { key: 'data_governance', label: 'Data Governance', short: 'GOV', color: 'oklch(70% 0.15 195)' },
  { key: 'data_sovereignty', label: 'Data Sovereignty', short: 'SOVR', color: 'oklch(75% 0.13 80)' },
  { key: 'privacy_engineering', label: 'Privacy Engineering', short: 'PRIVACY', color: 'oklch(65% 0.2 25)' },
]

function getRating(score) {
  if (score >= 900) return { label: 'AAA+', color: 'oklch(72% 0.17 145)' }
  if (score >= 800) return { label: 'AA+', color: 'oklch(68% 0.17 145)' }
  if (score >= 700) return { label: 'A+', color: 'oklch(65% 0.18 175)' }
  if (score >= 600) return { label: 'BBB', color: 'oklch(70% 0.16 85)' }
  return { label: 'BB', color: 'oklch(62% 0.20 25)' }
}

function competencyTag(v) {
  return v >= 9 ? '[MAX]' : v >= 7 ? '[HIGH]' : v >= 5 ? '[MODERATE]' : v >= 3 ? '[LOW]' : '[MIN]'
}

const RecruiterProfileDashboard = ({ data, onBack }) => {
  const {
    personalInfo = {},
    skills = [],
    experience = [],
    education = [],
    summary = {},
    competencyScores = {},
    recommendation = '',
    signatureProject = '',
    justification = '',
    interviewProbes = [],
  } = data || {}

  const derived = useMemo(() => {
    const yearsExp = summary?.totalYearsExperience || 0
    const totalSkills = summary?.totalSkills || skills.length || 0
    const score = Math.min(950, 600 + yearsExp * 18 + totalSkills * 3)
    return { score, rating: getRating(score) }
  }, [summary, skills])

  const name = (personalInfo?.name || 'CANDIDATE').toUpperCase()
  const role = (personalInfo?.title || 'Candidate').toUpperCase()
  const company = (personalInfo?.company || '').toUpperCase()
  const yearsExp = summary?.totalYearsExperience || 0
  const relevantExp = summary?.totalRelevantExperience || 0
  const topSkills = skills.slice(0, 4).length
    ? skills.slice(0, 4).map((s, i) => ({
        name: s.name || s,
        pct: s.level || [92, 78, 66, 44][i] || 60,
        color: ['oklch(68% 0.17 145)', 'oklch(65% 0.18 175)', 'oklch(62% 0.19 195)', 'oklch(55% 0.17 220)'][i],
      }))
    : []

  const [communicationStage, setCommunicationStage] = useState('Contacted')
  const [activeCommModal, setActiveCommModal] = useState(null)
  const email = personalInfo?.email || 'candidate@ava.com'
  const phone = personalInfo?.phone || '+44 20 7946 0958'
  const chatMessage = `Hi ${personalInfo?.name || 'there'}, this is AVA Recruiter. We'd like to discuss your profile and next steps for this opportunity.`

  return (
    <div style={{ background: 'oklch(11% 0.025 250)', color: 'oklch(96% 0.005 250)', minHeight: '100vh', padding: 'clamp(12px, 2vw, 28px)', fontFamily: 'Satoshi, Inter, sans-serif' }}>
      <div style={{ display: 'grid', gap: 14, maxWidth: 1500, margin: '0 auto' }}>
        <header style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 'clamp(13px,1.2vw,17px)', fontWeight: 800, letterSpacing: '0.04em' }}>
              CANDIDATE PROFILE VIEW
            </div>
            <div style={{ fontSize: 9, color: 'oklch(55% 0.02 250)', letterSpacing: '0.08em', marginTop: 2 }}>
              LIVING CAPABILITY INTELLIGENCE · EVIDENCE-BASED · EXPLAINABLE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, padding: '5px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#22C55E' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.7)', display: 'inline-block' }} />
              AVA GUIDES — HUMAN DECIDES
            </div>
            <button className="rl-ghost-btn" onClick={onBack}>← BACK TO MATRIX</button>
          </div>
        </header>

        <main style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.95fr', gap: 14, alignItems: 'start' }}>
          <div style={COLUMN}>
            <section style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: 'oklch(28% 0.02 250)', border: '2px solid rgba(255,255,255,0.55)', flexShrink: 0 }}>
                  <img src="/assets/profile-photo.avif" alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1.1 }}>{name}</div>
                  <div style={{ fontSize: 9, color: TEAL, letterSpacing: '0.1em', fontWeight: 600, marginTop: 3 }}>{role}</div>
                  {company && <div style={{ fontSize: 8, color: 'oklch(65% 0.02 250)', letterSpacing: '0.06em', marginTop: 2 }}>{company}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {['PROFILE: 94%', 'GDPR ✓', 'ICAEW ✓'].map(chip => (
                      <span key={chip} style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 7px', borderRadius: 3, background: 'oklch(60% 0.19 195 / 0.1)', border: '1px solid oklch(60% 0.19 195 / 0.3)', color: TEAL }}>{chip}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={DIVIDER} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, color: 'oklch(58% 0.02 250)' }}>MARKET TERMINAL</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="rl-ghost-btn">28 JUL 2026 ▾</button>
                  <button className="rl-cta-btn">REPORTS</button>
                </div>
              </div>
              <div style={{ ...DIVIDER, margin: '12px 0' }} />
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, color: 'oklch(58% 0.02 250)' }}>COMMUNICATION</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="rl-ghost-btn" onClick={() => setActiveCommModal('email')}>EMAIL</button>
                    <button type="button" className="rl-ghost-btn" onClick={() => setActiveCommModal('call')}>CALL</button>
                    <button type="button" className="rl-cta-btn" onClick={() => setActiveCommModal('chat')}>CHAT</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 9, color: 'oklch(55% 0.02 250)', letterSpacing: '0.08em' }}>COMMUNICATION STAGE</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Contacted', 'Called', 'Interview Scheduled', 'Interviewed'].map(stage => (
                      <button key={stage} type="button" onClick={() => setCommunicationStage(stage)} style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', padding: '4px 8px', borderRadius: 999, cursor: 'pointer', background: communicationStage === stage ? 'oklch(60% 0.19 195 / 0.16)' : 'transparent', border: communicationStage === stage ? '1px solid oklch(60% 0.19 195 / 0.45)' : '1px solid oklch(35% 0.03 250)', color: communicationStage === stage ? TEAL : 'oklch(70% 0.02 250)' }}>{stage.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={SECTION_TITLE}>Competency Vectors</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'oklch(55% 0.02 250)' }}>READ ONLY · SCORES /10</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {COMPETENCY_CRITERIA.map(c => {
                  const val = (competencyScores[c.key] ?? 0) * 2
                  const pct = (val / 10) * 100
                  return (
                    <div key={c.key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'oklch(88% 0.02 195)', letterSpacing: '0.02em' }}>{c.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: c.color, minWidth: 32, textAlign: 'right' }}>{val.toFixed(1)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: c.color }}>{competencyTag(val)}</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'oklch(26% 0.02 250)' }} />
                        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, borderRadius: 2, background: c.color }} />
                        <div style={{ position: 'absolute', left: `calc(${pct}% - 7px)`, width: 14, height: 14, borderRadius: '50%', background: c.color, boxShadow: `0 0 8px ${c.color}`, border: '2px solid oklch(15% 0.025 250)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {signatureProject && (
                <>
                  <div style={{ ...DIVIDER, margin: '16px 0 12px' }} />
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: 'oklch(55% 0.02 250)', textTransform: 'uppercase', marginBottom: 4 }}>Signature Project</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'oklch(88% 0.01 250)' }}>{signatureProject}</div>
                </>
              )}
            </section>
          </div>

          <div style={COLUMN}>
            <section style={CARD}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 18, alignItems: 'center' }}>
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: 112, height: 112, borderRadius: '50%', border: '10px solid oklch(24% 0.03 250)', borderTopColor: GREEN, borderRightColor: GREEN, display: 'grid', placeItems: 'center', boxShadow: '0 0 18px oklch(68% 0.17 145 / 0.2)' }}>
                    <div style={{ color: GREEN, fontWeight: 800, fontSize: 22 }}>{Math.round((derived.score / 1000) * 100)}%</div>
                  </div>
                </div>
                <div>
                  <div style={SECTION_TITLE}>Talent Credit Score</div>
                  <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1, marginTop: 8 }}>{derived.score}</div>
                  <div style={{ color: GREEN, fontWeight: 800, marginTop: 4 }}>RATING: [{derived.rating.label}]</div>
                  <div style={DIVIDER} />
                  <div style={{ fontSize: 9, color: 'oklch(55% 0.02 250)', letterSpacing: '0.08em' }}>VERIFICATION STATUS</div>
                  <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 10 }}>
                    {['GITHUB', 'GDPR COMPLIANCE', 'ICAEW CERTIFIED'].map(item => <span key={item} style={{ color: 'oklch(75% 0.02 250)' }}>{item}</span>)}
                  </div>
                </div>
              </div>
            </section>

            <section style={CARD}>
              <div style={SECTION_TITLE}>The Living Ledger <span style={{ color: 'oklch(55% 0.02 250)', fontWeight: 500 }}>(Proof of Work Feed)</span></div>
              <div style={DIVIDER} />
              <div style={{ display: 'grid', gap: 12 }}>
                {experience.slice(0, 3).map((e, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'start', paddingBottom: 10, borderBottom: '1px solid oklch(24% 0.03 250)' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{(e.title || 'ROLE').toUpperCase()} AT {(e.company || 'ORG').toUpperCase()}</div>
                      <div style={{ fontSize: 10, color: 'oklch(60% 0.02 250)', marginTop: 2 }}>CORP API · {e.endYear || e.startYear || '2024'}-01-01</div>
                    </div>
                    <div style={{ color: GREEN, fontWeight: 800, whiteSpace: 'nowrap' }}>+{[12, 8, 4][i] || 4} {['COMPLEXITY', 'VELOCITY', 'RISK MITIGATION'][i] || 'IMPACT'}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={CARD}>
              <div style={SECTION_TITLE}>Forward-Looking Analytics <span style={{ color: 'oklch(55% 0.02 250)', fontWeight: 500 }}>(Growth Map)</span></div>
              <div style={DIVIDER} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'oklch(75% 0.02 250)' }}>THE SLOPE ANALYSIS</div>
                  <svg viewBox="0 0 180 70" width="100%" height="80" preserveAspectRatio="none" style={{ marginTop: 8 }}>
                    <polyline points="6,54 42,42 78,30 114,18 160,8" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div style={{ fontSize: 10, color: GREEN }}>TRAJECTORY: HIGH</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'oklch(75% 0.02 250)' }}>SENSITIVITY ANALYSIS</div>
                  <div style={{ marginTop: 8, border: '1px solid oklch(30% 0.03 250)', borderRadius: 4, padding: 12, background: 'oklch(16% 0.03 250)' }}>
                    <div style={{ color: GREEN, fontWeight: 800 }}>LEARN RUST:</div>
                    <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>TALENT SCORE +45,<br />MARKET ACCESS +12%</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div style={COLUMN}>
            <section style={CARD}>
              <div style={SECTION_TITLE}>Liabilities & Equity <span style={{ color: 'oklch(55% 0.02 250)', fontWeight: 500 }}>(Value Drag / Growth)</span></div>
              <div style={DIVIDER} />
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <div style={LABEL_SM}>Liabilities (Obsolescence Risk)</div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', border: '8px solid oklch(24% 0.03 250)', borderTopColor: GREEN, borderRightColor: 'oklch(70% 0.16 85)', borderBottomColor: 'oklch(62% 0.20 25)' }} />
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'oklch(70% 0.16 85)' }}>MODERATE (12%/YR)</div>
                  </div>
                </div>
                <div style={{ borderLeft: '2px solid #ff4d4f', paddingLeft: 10, background: 'oklch(16% 0.03 250)', padding: 10, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'oklch(55% 0.02 250)' }}>COMPLEXITY GAP</div>
                  <div style={{ color: '#ff4d4f', fontWeight: 800, marginTop: 4 }}>LOW-LATENCY SYSTEMS (RED)</div>
                </div>
                <div>
                  <div style={LABEL_SM}>Residual Value</div>
                  <div style={{ color: GREEN, fontWeight: 800, fontSize: 20, marginTop: 6 }}>MODERATE (58%)</div>
                </div>
              </div>
            </section>

            <section style={CARD}>
              <div style={SECTION_TITLE}>Professional Equity <span style={{ color: 'oklch(55% 0.02 250)', fontWeight: 500 }}>(Net Worthiness)</span></div>
              <div style={DIVIDER} />
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ borderLeft: `2px solid ${GREEN}`, background: 'oklch(16% 0.03 250)', padding: 12, borderRadius: 4 }}><div style={{ fontSize: 10, color: 'oklch(55% 0.02 250)' }}>RESIDUAL VALUE</div><div style={{ fontWeight: 800, marginTop: 4 }}>STRATEGIC THINKING, ETHICS</div></div>
                <div style={{ borderLeft: `2px solid ${TEAL}`, background: 'oklch(16% 0.03 250)', padding: 12, borderRadius: 4 }}><div style={{ fontSize: 10, color: 'oklch(55% 0.02 250)' }}>RETAINED EARNINGS (GOODWILL)</div><div style={{ fontWeight: 800, marginTop: 4 }}>PROJECT COMPLETIONS × {experience.length || 3}</div></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}><span style={{ fontSize: 10, color: 'oklch(75% 0.02 250)' }}>TOTAL EQUITY INCREASE (LTM):</span><span style={{ fontSize: 30, fontWeight: 900, color: GREEN }}>+26%</span></div>
              </div>
            </section>

            <section style={CARD}>
              <div style={SECTION_TITLE}>Education & Qualifications</div>
              <div style={DIVIDER} />
              <div style={{ display: 'grid', gap: 12 }}>
                {education.map((e, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${GREEN}`, background: 'oklch(16% 0.03 250)', padding: 12, borderRadius: 4 }}>
                    <div style={{ fontWeight: 800 }}>{(e.degree || 'DEGREE').toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: 'oklch(70% 0.02 250)', marginTop: 3 }}>{(e.institution || 'INSTITUTION').toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        <section style={CARD}>
          <div style={SECTION_TITLE}>Additional Recruiter Detail</div>
          <div style={DIVIDER} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <div style={LABEL_SM}>Technical Skills</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {skills.map(skill => (
                  <div key={skill.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 40px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11 }}>{skill.name}</span>
                    <div style={{ height: 6, background: 'oklch(22% 0.02 250)', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${skill.level}%`, height: '100%', background: TEAL }} /></div>
                    <span style={{ fontSize: 11, color: TEAL, textAlign: 'right' }}>{skill.level}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={LABEL_SM}>Competency Scores</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {COMPETENCY_CRITERIA.map(c => {
                  const val = (competencyScores[c.key] ?? 0) * 2
                  return <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 34px', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 10, color: 'oklch(70% 0.02 250)' }}>{c.short}</span><div style={{ height: 6, background: 'oklch(22% 0.02 250)', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${(val / 10) * 100}%`, height: '100%', background: c.color }} /></div><span style={{ fontSize: 10, color: c.color, textAlign: 'right' }}>{val}/10</span></div>
                })}
              </div>
            </div>
            <div>
              <div style={LABEL_SM}>Interview Probes</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 6, color: 'oklch(80% 0.01 250)' }}>
                {interviewProbes.length ? interviewProbes.map((probe, i) => <div key={i}>{i + 1}. {probe}</div>) : <div>N/A</div>}
              </div>
            </div>
          </div>
        </section>
        {/* ── EMAIL modal (centred overlay) ── */}
        {activeCommModal === 'email' && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'grid', placeItems:'center', padding:16, zIndex:1000 }} onClick={() => setActiveCommModal(null)}>
            <div style={{ width:'min(560px, 100%)', background:'oklch(15% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:8, padding:18, boxShadow:'0 0 24px oklch(60% 0.22 195 / 0.18)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:800, letterSpacing:'0.08em' }}>EMAIL CANDIDATE</div>
                <button type="button" className="rl-ghost-btn" onClick={() => setActiveCommModal(null)}>CLOSE</button>
              </div>
              <div style={{ display:'grid', gap:12 }}>
                <div><div style={LABEL_SM}>FROM</div><div style={{ marginTop:4, fontSize:13 }}>recruiter@ava.com</div></div>
                <div><div style={LABEL_SM}>TO</div><div style={{ marginTop:4, fontSize:13 }}>{email}</div></div>
                <div><div style={LABEL_SM}>SUBJECT</div><div style={{ marginTop:4, fontSize:13 }}>AVA Recruiter Opportunity</div></div>
                <div><div style={LABEL_SM}>DRAFT EMAIL</div><div style={{ marginTop:4, minHeight:120, background:'oklch(12% 0.02 250)', border:'1px solid oklch(30% 0.03 250)', borderRadius:6, padding:12, lineHeight:1.6 }}>{chatMessage}</div></div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}><button type="button" className="rl-cta-btn" onClick={() => setActiveCommModal(null)}>SEND</button></div>
              </div>
            </div>
          </div>
        )}

        {/* ── CALL popup (bottom-right, compact) ── */}
        {activeCommModal === 'call' && (
          <div style={{ position:'fixed', bottom:28, right:28, zIndex:1100, width:300, background:'oklch(15% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.55)', overflow:'hidden' }}>
            {/* header */}
            <div style={{ background:'oklch(19% 0.04 250)', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>📞</span>
                <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', color:'oklch(90% 0.005 250)' }}>CALL CANDIDATE</span>
              </div>
              <button type="button" onClick={() => setActiveCommModal(null)} style={{ background:'none', border:'none', color:'oklch(55% 0.02 250)', cursor:'pointer', fontSize:16, lineHeight:1, padding:2 }}>✕</button>
            </div>
            {/* body */}
            <div style={{ padding:'16px 14px', display:'grid', gap:14 }}>
              <div>
                <div style={LABEL_SM}>PHONE NUMBER</div>
                <div style={{ marginTop:6, fontSize:20, fontWeight:800, color:TEAL, letterSpacing:'0.05em' }}>{phone}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={`tel:${phone.replace(/\s+/g, '')}`} style={{ flex:1, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'oklch(45% 0.17 145)', color:'#fff', fontWeight:800, fontSize:11, letterSpacing:'0.1em', padding:'10px 0', borderRadius:6, border:'none', cursor:'pointer' }}>
                  📞 DIAL NOW
                </a>
                <button type="button" onClick={() => setActiveCommModal(null)} style={{ padding:'10px 14px', background:'transparent', border:'1px solid oklch(35% 0.03 250)', borderRadius:6, color:'oklch(70% 0.02 250)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', cursor:'pointer' }}>
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT bot popup (bottom-right) ── */}
        {activeCommModal === 'chat' && (
          <div style={{ position:'fixed', bottom:28, right:28, zIndex:1100, width:320, height:420, display:'flex', flexDirection:'column', background:'oklch(15% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:14, boxShadow:'0 8px 40px rgba(0,0,0,0.6)', overflow:'hidden' }}>
            {/* header bar */}
            <div style={{ background:'oklch(19% 0.04 250)', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:`oklch(25% 0.05 195)`, border:`2px solid ${TEAL}`, display:'grid', placeItems:'center', fontSize:14 }}>🤖</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.06em', color:'oklch(90% 0.005 250)' }}>AVA RECRUITER</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:1 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 5px rgba(34,197,94,0.8)', display:'inline-block' }} />
                    <span style={{ fontSize:8, color:'#22C55E', letterSpacing:'0.08em', fontWeight:700 }}>ONLINE</span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setActiveCommModal(null)} style={{ background:'none', border:'none', color:'oklch(55% 0.02 250)', cursor:'pointer', fontSize:16, lineHeight:1, padding:2 }}>✕</button>
            </div>

            {/* message thread */}
            <div style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:10, background:'oklch(12% 0.025 250)' }}>
              {/* bot message */}
              <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'oklch(25% 0.05 195)', border:`1.5px solid ${TEAL}`, display:'grid', placeItems:'center', fontSize:11, flexShrink:0 }}>🤖</div>
                <div style={{ maxWidth:'75%', background:'oklch(19% 0.04 250)', border:'1px solid oklch(30% 0.04 195 / 0.5)', borderRadius:'12px 12px 12px 2px', padding:'9px 12px', fontSize:12, lineHeight:1.55, color:'oklch(88% 0.01 250)' }}>
                  {chatMessage}
                </div>
              </div>
              {/* candidate reply placeholder */}
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <div style={{ maxWidth:'75%', background:`oklch(45% 0.16 195 / 0.18)`, border:`1px solid oklch(55% 0.16 195 / 0.3)`, borderRadius:'12px 12px 2px 12px', padding:'9px 12px', fontSize:12, lineHeight:1.55, color:TEAL }}>
                  Thanks for reaching out! I'd be happy to discuss this opportunity.
                </div>
              </div>
              {/* typing indicator */}
              <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'oklch(25% 0.05 195)', border:`1.5px solid ${TEAL}`, display:'grid', placeItems:'center', fontSize:11, flexShrink:0 }}>🤖</div>
                <div style={{ background:'oklch(19% 0.04 250)', border:'1px solid oklch(30% 0.04 195 / 0.5)', borderRadius:'12px 12px 12px 2px', padding:'9px 14px', display:'flex', gap:4, alignItems:'center' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:TEAL, opacity:0.9, display:'inline-block' }} />
                  <span style={{ width:6, height:6, borderRadius:'50%', background:TEAL, opacity:0.6, display:'inline-block' }} />
                  <span style={{ width:6, height:6, borderRadius:'50%', background:TEAL, opacity:0.3, display:'inline-block' }} />
                </div>
              </div>
            </div>

            {/* input row */}
            <div style={{ flexShrink:0, padding:'10px 12px', background:'oklch(17% 0.03 250)', borderTop:'1px solid oklch(26% 0.03 250)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, background:'oklch(12% 0.025 250)', border:'1px solid oklch(30% 0.03 250)', borderRadius:20, padding:'7px 13px', fontSize:12, color:'oklch(45% 0.02 250)', letterSpacing:'0.02em', userSelect:'none' }}>
                Type a message…
              </div>
              <button type="button" style={{ width:34, height:34, borderRadius:'50%', background:TEAL, border:'none', cursor:'default', display:'grid', placeItems:'center', fontSize:14, flexShrink:0 }}>➤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecruiterProfileDashboard
