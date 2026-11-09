import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../AppContext'
import { exportResultCard } from '../lib/export'
import { gradeOf, round1 } from '../lib/stats'
import { Empty, Pct, Stat } from '../components/ui'

export default function StudentProfile() {
  const { id } = useParams()
  const nav = useNavigate()
  const { students, data, notify } = useApp()
  const st = data.studentStats.get(id)
  if (!st) return <Empty>Student not found. <Link to="/students">Back</Link></Empty>

  const idx = students.findIndex((s) => s.id === id)
  const prev = students[idx - 1]
  const next = students[idx + 1]

  const subj = st.subjects.map((s) => {
    const classAvg = data.subjectStats.find((x) => x.subject.id === s.subject.id)?.pct
    return { name: s.subject.name, student: round1(s.pct), class: round1(classAvg) }
  })
  // per-test trend, with class average of the same test
  const trend = st.rows
    .filter((r) => r.present)
    .map((r) => ({ label: `${r.test.subject?.name?.slice(0, 4)}·${r.test.title}`.slice(0, 18), date: r.test.test_date, student: round1(r.pct), class: round1(r.test.avgPct) }))

  const best = st.subjects.slice().sort((a, b) => b.pct - a.pct)[0]
  const weak = st.subjects.slice().sort((a, b) => a.pct - b.pct)[0]

  async function pdf() {
    try { await exportResultCard(st, data.classPct) } catch (e) { notify(e.message, 'err') }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/students" className="back">← Students</Link>
          <h1>{st.student.name}</h1>
          <p className="muted">Roll no {st.student.roll_no} · Section {st.student.section || '-'}</p>
        </div>
        <div className="actions">
          <button className="btn" disabled={!prev} onClick={() => nav(`/students/${prev.id}`)}>‹ Prev</button>
          <button className="btn" disabled={!next} onClick={() => nav(`/students/${next.id}`)}>Next ›</button>
          <button className="btn primary" onClick={pdf}>⬇ Result card (PDF)</button>
        </div>
      </div>

      <div className="grid stats">
        <Stat label="Overall" value={st.pct == null ? '-' : `${round1(st.pct)}%`} sub={`${st.obtained} / ${st.total} marks · Grade ${gradeOf(st.pct)}`} tone="primary" />
        <Stat label="Class rank" value={st.rank ? `#${st.rank}` : '-'} sub={`of ${data.ranked.length}`} />
        <Stat label="Tests taken" value={st.testsTaken} sub={`${st.rows.length - st.testsTaken} absent`} />
        <Stat label="Strongest" value={best ? best.subject.name : '-'} sub={best ? `${round1(best.pct)}%` : ''} tone="green" />
        <Stat label="Weakest" value={weak && st.subjects.length > 1 ? weak.subject.name : '-'} sub={weak && st.subjects.length > 1 ? `${round1(weak.pct)}%` : ''} tone="red" />
      </div>

      {st.testsTaken === 0 ? (
        <Empty>No marks have been entered for this student yet.</Empty>
      ) : (
        <>
          <div className="grid two">
            <div className="card">
              <h3>Subject-wise vs class average</h3>
              <div className="chart">
                <ResponsiveContainer>
                  <BarChart data={subj}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                    <Bar dataKey="student" name="Student" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="class" name="Class avg" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {subj.length >= 3 && (
              <div className="card">
                <h3>Strengths radar</h3>
                <div className="chart">
                  <ResponsiveContainer>
                    <RadarChart data={subj}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar dataKey="class" name="Class avg" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                      <Radar dataKey="student" name="Student" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                      <Legend />
                      <Tooltip formatter={(v) => `${v}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="card table-wrap">
            <h3>Subject-wise marks</h3>
            <table>
              <thead><tr><th>Subject</th><th>Tests</th><th>Marks</th><th>%</th><th>Grade</th><th>Class avg</th></tr></thead>
              <tbody>
                {st.subjects.map((s) => (
                  <tr key={s.subject.id}>
                    <td><span className="tag">{s.subject.name}</span></td>
                    <td>{s.tests}</td>
                    <td><b>{s.obtained}</b> / {s.total}</td>
                    <td><Pct v={s.pct} /></td>
                    <td>{gradeOf(s.pct)}</td>
                    <td>{round1(data.subjectStats.find((x) => x.subject.id === s.subject.id)?.pct) ?? '-'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Progress over tests</h3>
            <div className="chart tall">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.label} formatter={(v) => `${v}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="student" name="Student" stroke="#6366f1" strokeWidth={3} />
                  <Line type="monotone" dataKey="class" name="Class avg" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card table-wrap">
            <h3>All tests</h3>
            <table>
              <thead><tr><th>Date</th><th>Subject</th><th>Test</th><th>Marks</th><th>%</th><th>Class avg</th><th>vs class</th></tr></thead>
              <tbody>
                {st.rows.map((r) => {
                  const diff = r.present ? r.pct - r.test.avgPct : null
                  return (
                    <tr key={r.id}>
                      <td>{r.test.test_date}</td>
                      <td><span className="tag">{r.test.subject?.name}</span></td>
                      <td><Link to={`/tests/${r.test.id}`}>{r.test.title}</Link></td>
                      <td>{r.present ? `${r.obtained} / ${Number(r.test.total_marks)}` : 'Absent'}</td>
                      <td><Pct v={r.pct} /></td>
                      <td>{round1(r.test.avgPct) != null ? `${round1(r.test.avgPct)}%` : '-'}</td>
                      <td style={{ color: diff == null ? undefined : diff >= 0 ? 'var(--green)' : 'var(--red)' }}>{diff == null ? '-' : `${diff >= 0 ? '+' : ''}${round1(diff)}`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
