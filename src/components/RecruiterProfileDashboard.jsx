import { useMemo } from 'react'

const COMPETENCY_CRITERIA = [
  { key: 'pipeline_architecture', label: 'Pipeline Architecture', color: 'oklch(70% 0.17 145)' },
  { key: 'scalability', label: 'Scalability', color: 'oklch(72% 0.15 195)' },
  { key: 'data_governance', label: 'Data Governance', color: 'oklch(70% 0.15 195)' },
  { key: 'data_sovereignty', label: 'Data Sovereignty', color: 'oklch(75% 0.13 80)' },
  { key: 'privacy_engineering', label: 'Privacy Engineering', color: 'oklch(65% 0.2 25)' },
]

function scoreToRating(score) {
  if (score >= 900) return { label: 'AAA+', color: 'oklch(72% 0.17 145)' }
  if (score >= 800) return { label: 'AA+', color: 'oklch(68% 0.17 145)' }
  if (score >= 700) return { label: 'A+', color: 'oklch(65% 0.18 175)' }
  if (score >= 600) return { label: 'BBB', color: 'oklch(70% 0.16 85)' }
  return { label: 'BB', color: 'oklch(62% 0.20 25)' }
}

const RecruiterProfileDashboard = ({ data, onBack }) => {
  const { personalInfo = {}, skills = [], experience = [], education = [], summary = {}, competencyScores = {}, recommendation = '', signatureProject = '', justification = '', interviewProbes = [] } = data || {}

  const derived = useMemo(() => {
    const yearsExp = summary?.totalYearsExperience || 0
    const totalSkills = summary?.totalSkills || skills.length || 0
    const score = Math.min(950, 600 + yearsExp * 18 + totalSkills * 3)
    return { score, rating: scoreToRating(score) }
  }, [summary, skills])

  return (
    <div style={{ background:'oklch(12% 0.02 250)', minHeight:'100vh', color:'oklch(92% 0.01 250)', padding:16, fontFamily:'Satoshi, Inter, sans-serif' }}>
      <div style={{ display:'grid', gap:14, maxWidth:1400, margin:'0 auto' }}>
        <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:12, letterSpacing:'0.12em', color:'oklch(70% 0.19 195)', fontWeight:700 }}>CANDIDATE PROFILE VIEW</div>
            <div style={{ fontSize:28, fontWeight:800, letterSpacing:'0.04em', marginTop:4 }}>{(personalInfo.name || 'CANDIDATE').toUpperCase()}</div>
            <div style={{ fontSize:13, color:'oklch(70% 0.02 250)', marginTop:4 }}>{personalInfo.title || 'Candidate'}{personalInfo.company ? ` · ${personalInfo.company}` : ''}</div>
          </div>
          <button className="rl-ghost-btn" onClick={onBack}>← BACK TO MATRIX</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:14 }}>
          <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}><div style={{ fontSize:10, color:'oklch(55% 0.02 250)', letterSpacing:'0.08em' }}>TALENT SCORE</div><div style={{ fontSize:28, fontWeight:800, color:'oklch(70% 0.19 195)' }}>{derived.score}</div></div>
          <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}><div style={{ fontSize:10, color:'oklch(55% 0.02 250)', letterSpacing:'0.08em' }}>RATING</div><div style={{ fontSize:28, fontWeight:800, color:derived.rating.color }}>{derived.rating.label}</div></div>
          <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}><div style={{ fontSize:10, color:'oklch(55% 0.02 250)', letterSpacing:'0.08em' }}>TOTAL EXPERIENCE</div><div style={{ fontSize:28, fontWeight:800 }}>{summary.totalYearsExperience || 0}Y</div></div>
          <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}><div style={{ fontSize:10, color:'oklch(55% 0.02 250)', letterSpacing:'0.08em' }}>RELEVANT EXPERIENCE</div><div style={{ fontSize:28, fontWeight:800 }}>{summary.totalRelevantExperience || 0}Y</div></div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:14 }}>
          <div style={{ display:'grid', gap:14 }}>
            <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}>
              <div style={{ fontSize:10, letterSpacing:'0.1em', fontWeight:800, color:'oklch(90% 0.005 250)', textTransform:'uppercase' }}>Overview</div>
              <div style={{ height:1, background:'oklch(28% 0.03 250)', margin:'14px 0' }} />
              <div style={{ display:'grid', gap:12 }}>
                <div><div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', color:'oklch(55% 0.02 250)', textTransform:'uppercase' }}>Recommendation</div><div style={{ marginTop:6 }}>{recommendation || 'N/A'}</div></div>
                <div><div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', color:'oklch(55% 0.02 250)', textTransform:'uppercase' }}>Signature Project</div><div style={{ marginTop:6, lineHeight:1.6, color:'oklch(80% 0.01 250)' }}>{signatureProject || 'N/A'}</div></div>
                <div><div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', color:'oklch(55% 0.02 250)', textTransform:'uppercase' }}>Justification</div><div style={{ marginTop:6, lineHeight:1.6, color:'oklch(80% 0.01 250)' }}>{justification || 'N/A'}</div></div>
                <div><div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', color:'oklch(55% 0.02 250)', textTransform:'uppercase' }}>Interview Probes</div><div style={{ marginTop:6, display:'grid', gap:6 }}>{interviewProbes.length ? interviewProbes.map((probe, i) => <div key={i}>{i + 1}. {probe}</div>) : <div>N/A</div>}</div></div>
              </div>
            </div>

            <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}>
              <div style={{ fontSize:10, letterSpacing:'0.1em', fontWeight:800, color:'oklch(90% 0.005 250)', textTransform:'uppercase' }}>Experience Timeline</div>
              <div style={{ height:1, background:'oklch(28% 0.03 250)', margin:'14px 0' }} />
              <div style={{ display:'grid', gap:10 }}>{experience.map((e, i) => <div key={i} style={{ paddingLeft:12, borderLeft:'2px solid oklch(45% 0.16 195 / 0.35)' }}><div style={{ fontSize:11, color:'oklch(60% 0.02 250)' }}>{e.startYear || '—'} – {e.current ? 'Present' : (e.endYear || '—')}</div><div style={{ fontWeight:800 }}>{e.title}</div><div style={{ color:'oklch(70% 0.19 195)' }}>{e.company}</div></div>)}</div>
            </div>
          </div>

          <div style={{ display:'grid', gap:14 }}>
            <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}>
              <div style={{ fontSize:10, letterSpacing:'0.1em', fontWeight:800, color:'oklch(90% 0.005 250)', textTransform:'uppercase' }}>Technical Skills</div>
              <div style={{ height:1, background:'oklch(28% 0.03 250)', margin:'14px 0' }} />
              <div style={{ display:'grid', gap:8 }}>{skills.map(skill => <div key={skill.name} style={{ display:'grid', gridTemplateColumns:'120px 1fr 40px', gap:8, alignItems:'center' }}><span style={{ fontSize:11 }}>{skill.name}</span><div style={{ height:6, background:'oklch(22% 0.02 250)', borderRadius:999, overflow:'hidden' }}><div style={{ width:`${skill.level}%`, height:'100%', background:'oklch(70% 0.19 195)' }} /></div><span style={{ fontSize:11, color:'oklch(70% 0.19 195)', textAlign:'right' }}>{skill.level}%</span></div>)}</div>
            </div>

            <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}>
              <div style={{ fontSize:10, letterSpacing:'0.1em', fontWeight:800, color:'oklch(90% 0.005 250)', textTransform:'uppercase' }}>Competency Scores</div>
              <div style={{ height:1, background:'oklch(28% 0.03 250)', margin:'14px 0' }} />
              <div style={{ display:'grid', gap:8 }}>{COMPETENCY_CRITERIA.map(c => { const raw = competencyScores[c.key] ?? 0; const score = raw * 2; return <div key={c.key} style={{ display:'grid', gridTemplateColumns:'110px 1fr 34px', gap:8, alignItems:'center' }}><span style={{ fontSize:10, color:'oklch(70% 0.02 250)' }}>{c.label}</span><div style={{ height:6, background:'oklch(22% 0.02 250)', borderRadius:999, overflow:'hidden' }}><div style={{ width:`${(score / 10) * 100}%`, height:'100%', background:c.color }} /></div><span style={{ fontSize:10, color:c.color, textAlign:'right' }}>{score}/10</span></div> })}</div>
            </div>

            <div style={{ background:'oklch(17% 0.03 250)', border:'1px solid oklch(45% 0.16 195 / 0.45)', borderRadius:6, padding:18 }}>
              <div style={{ fontSize:10, letterSpacing:'0.1em', fontWeight:800, color:'oklch(90% 0.005 250)', textTransform:'uppercase' }}>Education</div>
              <div style={{ height:1, background:'oklch(28% 0.03 250)', margin:'14px 0' }} />
              <div style={{ display:'grid', gap:10 }}>{education.map((e, i) => <div key={i}><div style={{ fontWeight:700 }}>{e.degree}</div><div style={{ color:'oklch(70% 0.02 250)' }}>{e.institution}</div><div style={{ fontSize:11, color:'oklch(55% 0.02 250)' }}>{e.graduationYear}</div></div>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecruiterProfileDashboard
