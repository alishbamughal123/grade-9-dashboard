import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../AppContext'
import { Empty, Modal, Pct } from '../components/ui'

export default function Tests() {
  const { data, subjects, isAdmin, mySubjectIds, session, notify, reload } = useApp()
  const nav = useNavigate()
  const [subjectF, setSubjectF] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const allowed = isAdmin ? subjects : subjects.filter((s) => mySubjectIds.has(s.id))
  const [form, setForm] = useState({ subject_id: '', title: '', total_marks: '', test_date: new Date().toISOString().slice(0, 10) })

  const list = data.testList.filter((t) => (!subjectF || t.subject_id === subjectF) && (!mineOnly || t.created_by === session.user.id))

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    const { data: row, error } = await supabase
      .from('tests')
      .insert({ subject_id: form.subject_id, title: form.title.trim(), total_marks: Number(form.total_marks), test_date: form.test_date, created_by: session.user.id })
      .select()
      .single()
    setBusy(false)
    if (error) return notify(error.message, 'err')
    await reload()
    notify('Test created. You can enter marks now.')
    nav(`/tests/${row.id}`)
  }

  return (
    <>
      <div className="page-head">
        <h1>Tests</h1>
        <button className="btn primary" onClick={() => { setForm({ ...form, subject_id: allowed[0]?.id || '' }); setOpen(true) }} disabled={!allowed.length}>
          + New test
        </button>
      </div>
      {!allowed.length && <div className="note">No book is assigned to you yet. Ask the admin to assign one in Admin → Teachers.</div>}

      <div className="filters">
        <select value={subjectF} onChange={(e) => setSubjectF(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> My tests only</label>
      </div>

      {list.length === 0 ? (
        <Empty>No tests found.</Empty>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Subject</th><th>Test</th><th>By</th><th>Total</th><th>Entered</th><th>Avg</th><th>High</th><th>Low</th><th /></tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>{t.test_date}</td>
                  <td><span className="tag">{t.subject?.name}</span></td>
                  <td><b>{t.title}</b></td>
                  <td>{t.owner?.name}{t.created_by === session.user.id && <span className="tag me">you</span>}</td>
                  <td>{Number(t.total_marks)}</td>
                  <td>{t.attempted}</td>
                  <td><Pct v={t.avgPct} /></td>
                  <td className="hi"><Pct v={t.highPct} /></td>
                  <td className="lo"><Pct v={t.lowPct} /></td>
                  <td><Link className="btn sm" to={`/tests/${t.id}`}>{t.created_by === session.user.id || isAdmin ? 'Open / Enter' : 'View'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="New test" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={create}>
            <label>Book / Subject</label>
            <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              {allowed.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <label>Test name</label>
            <input required placeholder="e.g. Chapter 3 Quiz" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="row2">
              <div><label>Total marks</label><input required type="number" min="1" step="any" value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: e.target.value })} /></div>
              <div><label>Date</label><input required type="date" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} /></div>
            </div>
            <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create & enter marks'}</button>
          </form>
        </Modal>
      )}
    </>
  )
}
