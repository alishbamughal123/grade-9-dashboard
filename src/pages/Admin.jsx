import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../AppContext'

export default function Admin() {
  const [tab, setTab] = useState('books')
  return (
    <>
      <div className="page-head"><h1>Admin</h1></div>
      <div className="tabs">
        {[['books', '📚 Books'], ['teachers', '👩‍🏫 Teachers'], ['students', '🎓 Students']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'books' && <Books />}
      {tab === 'teachers' && <Teachers />}
      {tab === 'students' && <StudentsAdmin />}
    </>
  )
}

function useRun() {
  const { notify, reload } = useApp()
  return async (promise, okMsg) => {
    const { error } = await promise
    if (error) return notify(error.message, 'err') || false
    await reload()
    if (okMsg) notify(okMsg)
    return true
  }
}

/* ------------------------------ Books ------------------------------ */
function Books() {
  const { subjects, data } = useApp()
  const run = useRun()
  const [name, setName] = useState('')

  async function add(e) {
    e.preventDefault()
    if (await run(supabase.from('subjects').insert({ name: name.trim() }), 'Book added')) setName('')
  }
  async function del(s) {
    if (window.confirm(`Deleting "${s.name}" will also delete all its tests and marks. Continue?`)) run(supabase.from('subjects').delete().eq('id', s.id), 'Deleted')
  }
  async function rename(s) {
    const n = window.prompt('New name', s.name)
    if (n && n.trim() && n !== s.name) run(supabase.from('subjects').update({ name: n.trim() }).eq('id', s.id), 'Renamed')
  }

  return (
    <div className="card">
      <h3>Books / Subjects</h3>
      <form className="inline-form" onSubmit={add}>
        <input required placeholder="e.g. Physics" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary">+ Add book</button>
      </form>
      <ul className="plain-list">
        {subjects.map((s) => (
          <li key={s.id}>
            <b>{s.name}</b>
            <span className="muted">{data.testList.filter((t) => t.subject_id === s.id).length} tests</span>
            <span className="grow" />
            <button className="btn sm" onClick={() => rename(s)}>Rename</button>
            <button className="btn sm danger" onClick={() => del(s)}>Delete</button>
          </li>
        ))}
        {!subjects.length && <li className="muted">Add books first, then assign them from the Teachers tab.</li>}
      </ul>
    </div>
  )
}

/* ----------------------------- Teachers ----------------------------- */
function Teachers() {
  const { profiles, subjects, assignments, session } = useApp()
  const run = useRun()
  const has = (t, s) => assignments.some((a) => a.teacher_id === t && a.subject_id === s)

  const toggle = (t, s) =>
    has(t, s)
      ? run(supabase.from('teacher_subjects').delete().match({ teacher_id: t, subject_id: s }))
      : run(supabase.from('teacher_subjects').insert({ teacher_id: t, subject_id: s }))

  return (
    <div className="card">
      <h3>Teachers & book assignment</h3>
      <p className="muted">
        New teacher: Supabase → Authentication → Users → <b>Add user</b> (email + password, "Auto confirm" on). They will appear here automatically.
      </p>
      {profiles.map((p) => (
        <div className="teacher" key={p.id}>
          <div className="teacher-head">
            <div><b>{p.name}</b> <small className="muted">{p.email}</small></div>
            <select
              value={p.role}
              disabled={p.id === session.user.id}
              onChange={(e) => run(supabase.from('profiles').update({ role: e.target.value }).eq('id', p.id), 'Role updated')}
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn sm" onClick={() => { const n = window.prompt('Display name', p.name); if (n?.trim()) run(supabase.from('profiles').update({ name: n.trim() }).eq('id', p.id), 'Name updated') }}>Rename</button>
          </div>
          {p.role === 'teacher' && (
            <div className="chips">
              {subjects.map((s) => (
                <label key={s.id} className={`chip ${has(p.id, s.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={has(p.id, s.id)} onChange={() => toggle(p.id, s.id)} />
                  {s.name}
                </label>
              ))}
              {!subjects.length && <span className="muted">No books yet</span>}
            </div>
          )}
          {p.role === 'admin' && <small className="muted">Admin can create tests in every book.</small>}
        </div>
      ))}
    </div>
  )
}

/* ----------------------------- Students ----------------------------- */
function StudentsAdmin() {
  const { students } = useApp()
  const run = useRun()
  const [one, setOne] = useState({ roll_no: '', name: '', section: 'A' })
  const [bulk, setBulk] = useState('')
  const { notify } = useApp()

  async function add(e) {
    e.preventDefault()
    if (await run(supabase.from('students').insert({ ...one, name: one.name.trim(), roll_no: one.roll_no.trim() }), 'Student added')) setOne({ roll_no: '', name: '', section: one.section })
  }

  async function addBulk() {
    const rows = bulk
      .split('\n')
      .map((l) => l.split(/[,\t]/).map((x) => x.trim()))
      .filter((p) => p[0] && p[1])
      .map((p) => ({ roll_no: p[0], name: p[1], section: p[2] || 'A' }))
    if (!rows.length) return notify('Format: rollno, name, section (one student per line)', 'err')
    if (await run(supabase.from('students').upsert(rows, { onConflict: 'roll_no' }), `${rows.length} students saved`)) setBulk('')
  }

  async function edit(s) {
    const name = window.prompt('Name', s.name)
    if (name?.trim()) run(supabase.from('students').update({ name: name.trim() }).eq('id', s.id), 'Updated')
  }
  async function del(s) {
    if (window.confirm(`Deleting ${s.name} will also delete all their marks. Continue?`)) run(supabase.from('students').delete().eq('id', s.id), 'Deleted')
  }

  return (
    <>
      <div className="grid two">
        <div className="card">
          <h3>Add one student</h3>
          <form className="form" onSubmit={add}>
            <div className="row2">
              <div><label>Roll no</label><input required value={one.roll_no} onChange={(e) => setOne({ ...one, roll_no: e.target.value })} /></div>
              <div><label>Section</label><input value={one.section} onChange={(e) => setOne({ ...one, section: e.target.value })} /></div>
            </div>
            <label>Name</label>
            <input required value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} />
            <button className="btn primary">+ Add student</button>
          </form>
        </div>
        <div className="card">
          <h3>Bulk add / update</h3>
          <p className="muted">Paste from Excel or type one student per line: <code>rollno, name, section</code>. A roll number that already exists is updated instead of duplicated.</p>
          <textarea rows={6} placeholder={'1, Ayesha Khan, A\n2, Ali Raza, A'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button className="btn primary" onClick={addBulk}>Save all</button>
        </div>
      </div>
      <div className="card table-wrap">
        <h3>All students ({students.length})</h3>
        <table>
          <thead><tr><th>Roll</th><th>Name</th><th>Section</th><th /></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.roll_no}</td><td>{s.name}</td><td>{s.section}</td>
                <td className="actions"><button className="btn sm" onClick={() => edit(s)}>Edit</button><button className="btn sm danger" onClick={() => del(s)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
