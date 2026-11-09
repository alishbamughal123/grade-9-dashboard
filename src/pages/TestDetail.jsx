import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useApp } from '../AppContext'
import { gradeOf, round1, PASS_PERCENT } from '../lib/stats'
import { Empty, Modal, Pct, Stat } from '../components/ui'

export default function TestDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, students, session, isAdmin, notify, reload } = useApp()
  const test = data.testById.get(id)
  const canEdit = test && (test.created_by === session.user.id || isAdmin)

  const [vals, setVals] = useState({})
  const [busy, setBusy] = useState(false)
  const [editMeta, setEditMeta] = useState(false)
  const [meta, setMeta] = useState({})

  useEffect(() => {
    if (!test) return
    const v = {}
    students.forEach((s) => {
      const r = test.rows.find((x) => x.student_id === s.id)
      v[s.id] = { obtained: r && r.present ? String(r.obtained) : '', absent: r ? r.absent : false, rowId: r?.id }
    })
    setVals(v)
    setMeta({ title: test.title, total_marks: String(test.total_marks), test_date: test.test_date })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test?.id, test?.rows.length, students.length, data])

  const live = useMemo(() => {
    // live percentages as teacher types, so highest/lowest highlight instantly
    if (!test) return { rows: [], hi: null, lo: null }
    const total = Number(test.total_marks)
    const rows = students.map((s) => {
      const v = vals[s.id] || { obtained: '', absent: false }
      const ok = !v.absent && v.obtained !== '' && !Number.isNaN(Number(v.obtained))
      return { s, v, pct: ok ? (Number(v.obtained) / total) * 100 : null }
    })
    const ps = rows.filter((r) => r.pct != null).map((r) => r.pct)
    return { rows, hi: ps.length ? Math.max(...ps) : null, lo: ps.length > 1 ? Math.min(...ps) : null }
  }, [vals, students, test])

  if (!test) return <Empty>Test not found. <Link to="/tests">Back</Link></Empty>
  const total = Number(test.total_marks)

  async function save() {
    const upserts = []
    const deletes = []
    for (const s of students) {
      const v = vals[s.id]
      const blank = v.obtained === '' && !v.absent
      if (blank) {
        if (v.rowId) deletes.push(v.rowId)
        continue
      }
      if (!v.absent) {
        const n = Number(v.obtained)
        if (Number.isNaN(n) || n < 0 || n > total) return notify(`${s.name}: marks must be between 0 and ${total}`, 'err')
      }
      upserts.push({ test_id: test.id, student_id: s.id, obtained: v.absent ? null : Number(v.obtained), absent: v.absent, updated_at: new Date().toISOString() })
    }
    setBusy(true)
    let err
    if (upserts.length) ({ error: err } = await supabase.from('marks').upsert(upserts, { onConflict: 'test_id,student_id' }))
    if (!err && deletes.length) ({ error: err } = await supabase.from('marks').delete().in('id', deletes))
    setBusy(false)
    if (err) return notify(err.message, 'err')
    await reload()
    notify('Marks saved ✓')
  }

  async function saveMeta(e) {
    e.preventDefault()
    const { error } = await supabase.from('tests').update({ title: meta.title.trim(), total_marks: Number(meta.total_marks), test_date: meta.test_date }).eq('id', test.id)
    if (error) return notify(error.message, 'err')
    setEditMeta(false)
    await reload()
    notify('Test updated')
  }

  async function del() {
    if (!window.confirm(`Deleting "${test.title}" will also delete all its marks. Continue?`)) return
    const { error } = await supabase.from('tests').delete().eq('id', test.id)
    if (error) return notify(error.message, 'err')
    await reload()
    notify('Test deleted')
    nav('/tests')
  }

  const chart = live.rows.filter((r) => r.pct != null).map((r) => ({ name: r.s.name.split(' ')[0], full: r.s.name, pct: round1(r.pct) }))

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/tests" className="back">← Tests</Link>
          <h1>{test.subject?.name} — {test.title}</h1>
          <p className="muted">{test.test_date} · Total {total} marks · Entered by <b>{test.owner?.name}</b></p>
        </div>
        {canEdit && (
          <div className="actions">
            <button className="btn" onClick={() => setEditMeta(true)}>Edit test</button>
            <button className="btn danger" onClick={del}>Delete</button>
          </div>
        )}
      </div>

      {!canEdit && <div className="note">👁 View only. This test was entered by <b>{test.owner?.name}</b>, and only they can edit it.</div>}

      <div className="grid stats">
        <Stat label="Average" value={test.avgPct == null ? '-' : `${round1(test.avgPct)}%`} tone="primary" />
        <Stat label="Highest" value={test.highPct == null ? '-' : `${round1(test.highPct)}%`} tone="green" />
        <Stat label="Lowest" value={test.lowPct == null ? '-' : `${round1(test.lowPct)}%`} tone="red" />
        <Stat label="Pass rate" value={test.passRate == null ? '-' : `${Math.round(test.passRate)}%`} sub={`pass ≥ ${PASS_PERCENT}%`} />
        <Stat label="Appeared / Absent" value={`${test.attempted} / ${test.absentCount}`} />
      </div>

      <div className="card table-wrap">
        <table className="marks-table">
          <thead>
            <tr><th>Roll</th><th>Student</th><th>Marks (/{total})</th><th>Absent</th><th>%</th><th>Grade</th></tr>
          </thead>
          <tbody>
            {live.rows.map(({ s, v, pct }) => {
              const cls = pct != null && pct === live.hi ? 'hi-row' : pct != null && pct === live.lo ? 'lo-row' : ''
              return (
                <tr key={s.id} className={cls}>
                  <td>{s.roll_no}</td>
                  <td><Link to={`/students/${s.id}`}>{s.name}</Link>{cls === 'hi-row' && ' 🏆'}{cls === 'lo-row' && ' ⚠️'}</td>
                  <td>
                    {canEdit ? (
                      <input
                        className="mark-input"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={total}
                        step="any"
                        disabled={v.absent}
                        value={v.obtained}
                        onChange={(e) => setVals({ ...vals, [s.id]: { ...v, obtained: e.target.value } })}
                      />
                    ) : v.absent ? 'Absent' : v.obtained === '' ? <span className="muted">-</span> : v.obtained}
                  </td>
                  <td>{canEdit ? <input type="checkbox" checked={v.absent} onChange={(e) => setVals({ ...vals, [s.id]: { ...v, absent: e.target.checked, obtained: e.target.checked ? '' : v.obtained } })} /> : v.absent ? '✓' : ''}</td>
                  <td><Pct v={pct} /></td>
                  <td>{pct == null ? '-' : gradeOf(pct)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {canEdit && (
          <div className="sticky-save">
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save marks'}</button>
          </div>
        )}
      </div>

      {chart.length > 0 && (
        <div className="card">
          <h3>Student-wise percentage</h3>
          <div className="chart tall">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-40} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} labelFormatter={(_, p) => p?.[0]?.payload?.full} />
                <ReferenceLine y={PASS_PERCENT} stroke="#ef4444" strokeDasharray="4 4" />
                <Bar dataKey="pct" name="%" radius={[4, 4, 0, 0]}>
                  {chart.map((c) => <Cell key={c.full} fill={c.pct === round1(live.hi) ? '#22c55e' : c.pct === round1(live.lo) ? '#ef4444' : '#6366f1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {editMeta && (
        <Modal title="Edit test" onClose={() => setEditMeta(false)}>
          <form className="form" onSubmit={saveMeta}>
            <label>Test name</label>
            <input required value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <div className="row2">
              <div><label>Total marks</label><input required type="number" min="1" step="any" value={meta.total_marks} onChange={(e) => setMeta({ ...meta, total_marks: e.target.value })} /></div>
              <div><label>Date</label><input required type="date" value={meta.test_date} onChange={(e) => setMeta({ ...meta, test_date: e.target.value })} /></div>
            </div>
            <button className="btn primary">Save</button>
          </form>
        </Modal>
      )}
    </>
  )
}
