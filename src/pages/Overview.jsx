import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../AppContext'
import { gradeOf, isPass, round1, testTrend } from '../lib/stats'
import { COLORS, Empty, Pct, Stat } from '../components/ui'

export default function Overview() {
  const { data, students, subjects } = useApp()
  const { ranked, testList, subjectStats, classPct } = data

  const gradeBuckets = ['A+', 'A', 'B', 'C', 'D', 'F'].map((g) => ({
    name: g,
    value: ranked.filter((s) => gradeOf(s.pct) === g).length,
  }))
  const gradeCols = { 'A+': '#16a34a', A: '#22c55e', B: '#3b82f6', C: '#06b6d4', D: '#f59e0b', F: '#ef4444' }

  const tested = testList.filter((t) => t.avgPct != null)
  const bestTest = tested.slice().sort((a, b) => b.avgPct - a.avgPct)[0]
  const worstTest = tested.slice().sort((a, b) => a.avgPct - b.avgPct)[0]
  const subjData = subjectStats.filter((s) => s.pct != null).map((s) => ({ name: s.subject.name, pct: round1(s.pct) }))
  const top = ranked.slice(0, 5)
  const bottom = ranked.slice(-5).reverse()
  const passing = ranked.filter((s) => isPass(s.pct)).length

  return (
    <>
      <div className="page-head">
        <h1>Overview</h1>
      </div>

      <div className="grid stats">
        <Stat label="Students" value={students.length} />
        <Stat label="Books / Subjects" value={subjects.length} />
        <Stat label="Tests conducted" value={testList.length} />
        <Stat label="Class average" value={classPct == null ? '-' : `${round1(classPct)}%`} tone="primary" />
        <Stat label="Pass rate (overall)" value={ranked.length ? `${Math.round((passing / ranked.length) * 100)}%` : '-'} sub={`${passing}/${ranked.length} students`} tone="green" />
      </div>

      {testList.length === 0 ? (
        <Empty>No tests yet. Create the first one from the <Link to="/tests">Tests</Link> page.</Empty>
      ) : (
        <>
          <div className="grid two">
            <div className="card">
              <h3>Subject-wise class average</h3>
              <div className="chart">
                <ResponsiveContainer>
                  <BarChart data={subjData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="pct" name="Average %" radius={[6, 6, 0, 0]}>
                      {subjData.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3>Grade distribution</h3>
              <div className="chart">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={gradeBuckets.filter((g) => g.value)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} label={(e) => `${e.name} (${e.value})`}>
                      {gradeBuckets.filter((g) => g.value).map((g) => <Cell key={g.name} fill={gradeCols[g.name]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Test-by-test trend <small className="muted">(class average / highest / lowest %)</small></h3>
            <div className="chart tall">
              <ResponsiveContainer>
                <LineChart data={testTrend(testList)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.name} formatter={(v) => `${v}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="high" name="Highest" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avg" name="Average" stroke="#6366f1" strokeWidth={3} />
                  <Line type="monotone" dataKey="low" name="Lowest" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid two">
            <div className="card">
              <h3>🏆 Top performers</h3>
              <ul className="rank-list">
                {top.map((s) => (
                  <li key={s.student.id} className="hi">
                    <span className="rk">#{s.rank}</span>
                    <Link to={`/students/${s.student.id}`}>{s.student.name}</Link>
                    <Pct v={s.pct} grade />
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3>⚠️ Need attention</h3>
              <ul className="rank-list">
                {bottom.map((s) => (
                  <li key={s.student.id} className="lo">
                    <span className="rk">#{s.rank}</span>
                    <Link to={`/students/${s.student.id}`}>{s.student.name}</Link>
                    <Pct v={s.pct} grade />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid two">
            {[['Highest scoring test', bestTest, 'hi'], ['Lowest scoring test', worstTest, 'lo']].map(([label, t, cls]) =>
              t ? (
                <div key={label} className={`card callout ${cls}`}>
                  <small>{label}</small>
                  <Link to={`/tests/${t.id}`}><b>{t.subject?.name} — {t.title}</b></Link>
                  <span>Average <Pct v={t.avgPct} /> · {t.test_date}</span>
                </div>
              ) : null,
            )}
          </div>
        </>
      )}
    </>
  )
}
