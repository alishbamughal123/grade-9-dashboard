import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../AppContext'
import { gradeOf, round1 } from '../lib/stats'
import { Empty } from '../components/ui'

const sum = (a) => a.reduce((s, x) => s + x, 0)

function Marks({ obtained, total, pct }) {
  return (
    <>
      <b>{round1(obtained)}</b>/{round1(total)}
      <span className="sub">{round1(pct)}%</span>
    </>
  )
}

export default function ClassView() {
  const { students, subjects, data } = useApp()
  const [subjectId, setSubjectId] = useState('') // '' = all subjects summary

  const tests = useMemo(
    () =>
      data.testList
        .filter((t) => t.subject_id === subjectId)
        .slice()
        .sort((a, b) => a.test_date.localeCompare(b.test_date) || a.created_at.localeCompare(b.created_at)),
    [data, subjectId],
  )

  // One row per student for the selected subject
  const rows = useMemo(() => {
    if (!subjectId) return []
    const list = students.map((s) => {
      const cells = tests.map((t) => t.rows.find((r) => r.student_id === s.id))
      const present = cells.filter((c) => c?.present)
      const obtained = sum(present.map((c) => Number(c.obtained)))
      const total = sum(present.map((c) => Number(c.test.total_marks)))
      return { s, cells, obtained, total, pct: total ? (obtained / total) * 100 : null }
    })
    const order = list.filter((r) => r.pct != null).sort((a, b) => b.pct - a.pct)
    order.forEach((r, i) => { r.rank = i + 1 })
    return list
  }, [students, tests, subjectId])

  const subjHi = Math.max(...rows.filter((r) => r.pct != null).map((r) => r.pct), -1)
  const subjLo = Math.min(...rows.filter((r) => r.pct != null).map((r) => r.pct), 101)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Class view</h1>
          <p className="muted">Marks and percentage of every student, test by test.</p>
        </div>
      </div>

      <div className="filters">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">All subjects (summary)</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!subjectId ? (
        <div className="card table-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="sticky-col">Student</th>
                {subjects.map((s) => <th key={s.id}>{s.name}</th>)}
                <th>Overall</th><th>Grade</th><th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const st = data.studentStats.get(s.id)
                const cls = st.rank === 1 ? 'hi-row' : st.rank === data.ranked.length && data.ranked.length > 1 ? 'lo-row' : ''
                return (
                  <tr key={s.id} className={cls}>
                    <td className="sticky-col"><Link to={`/students/${s.id}`}>{s.roll_no}. {s.name}</Link></td>
                    {subjects.map((sub) => {
                      const x = st.subjects.find((y) => y.subject.id === sub.id)
                      return <td key={sub.id}>{x ? <Marks obtained={x.obtained} total={x.total} pct={x.pct} /> : <span className="muted">-</span>}</td>
                    })}
                    <td>{st.testsTaken ? <Marks obtained={st.obtained} total={st.total} pct={st.pct} /> : <span className="muted">-</span>}</td>
                    <td>{gradeOf(st.pct)}</td>
                    <td>{st.rank ? `#${st.rank}` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : tests.length === 0 ? (
        <Empty>No tests have been created for this subject yet.</Empty>
      ) : (
        <div className="card table-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="sticky-col">Student</th>
                {tests.map((t) => (
                  <th key={t.id}>
                    <Link to={`/tests/${t.id}`}>{t.title}</Link>
                    <span className="sub">{t.test_date} · /{Number(t.total_marks)}</span>
                  </th>
                ))}
                <th>Total</th><th>Grade</th><th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowCls = r.pct != null && r.pct === subjHi ? 'hi-row' : r.pct != null && r.pct === subjLo && r.pct !== subjHi ? 'lo-row' : ''
                return (
                  <tr key={r.s.id} className={rowCls}>
                    <td className="sticky-col"><Link to={`/students/${r.s.id}`}>{r.s.roll_no}. {r.s.name}</Link></td>
                    {r.cells.map((c, i) => {
                      const t = tests[i]
                      const cellCls = c?.present && c.pct === t.highPct ? 'cell-hi' : c?.present && c.pct === t.lowPct && t.attempted > 1 && t.lowPct !== t.highPct ? 'cell-lo' : ''
                      return (
                        <td key={t.id} className={cellCls}>
                          {c ? c.present ? <Marks obtained={c.obtained} total={t.total_marks} pct={c.pct} /> : <span className="muted">Absent</span> : <span className="muted">-</span>}
                        </td>
                      )
                    })}
                    <td>{r.total ? <Marks obtained={r.obtained} total={r.total} pct={r.pct} /> : <span className="muted">-</span>}</td>
                    <td>{gradeOf(r.pct)}</td>
                    <td>{r.rank ? `#${r.rank}` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky-col"><b>Class average</b></td>
                {tests.map((t) => (
                  <td key={t.id}>
                    {t.avgPct == null ? '-' : <Marks obtained={(t.avgPct * Number(t.total_marks)) / 100} total={t.total_marks} pct={t.avgPct} />}
                  </td>
                ))}
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  )
}
