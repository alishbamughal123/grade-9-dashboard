import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../AppContext'
import { Empty, Pct } from '../components/ui'

export default function Students() {
  const { students, data, isAdmin } = useApp()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('roll')

  let list = students.filter((s) => (s.name + s.roll_no).toLowerCase().includes(q.toLowerCase()))
  const st = (s) => data.studentStats.get(s.id)
  if (sort === 'rank') list = list.slice().sort((a, b) => (st(a).rank ?? 999) - (st(b).rank ?? 999))

  const hi = data.ranked[0]?.student.id
  const lo = data.ranked.length > 1 ? data.ranked[data.ranked.length - 1].student.id : null

  return (
    <>
      <div className="page-head">
        <h1>Students <small className="muted">({students.length})</small></h1>
        {isAdmin && <Link className="btn" to="/admin">Manage students</Link>}
      </div>
      <div className="filters">
        <input placeholder="Search name or roll no…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="roll">Sort: Roll no</option>
          <option value="rank">Sort: Rank</option>
        </select>
      </div>
      {list.length === 0 ? (
        <Empty>No students found.</Empty>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Tests</th><th>Marks</th><th>Overall</th><th>Rank</th><th /></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className={s.id === hi ? 'hi-row' : s.id === lo ? 'lo-row' : ''}>
                  <td>{s.roll_no}</td>
                  <td><b>{s.name}</b></td>
                  <td>{st(s).testsTaken}</td>
                  <td>{st(s).testsTaken ? `${st(s).obtained} / ${st(s).total}` : '-'}</td>
                  <td><Pct v={st(s).pct} grade /></td>
                  <td>{st(s).rank ? `#${st(s).rank}` : '-'}</td>
                  <td><Link className="btn sm" to={`/students/${s.id}`}>Profile</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
