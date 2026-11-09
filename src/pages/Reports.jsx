import { useState } from 'react'
import { useApp } from '../AppContext'
import { exportAllResultCards, exportClassPdf, exportExcel, exportResultCard } from '../lib/export'

export default function Reports() {
  const { data, students, subjects, notify } = useApp()
  const [busy, setBusy] = useState('')
  const [sid, setSid] = useState('')

  async function run(key, fn) {
    setBusy(key)
    try { await fn() } catch (e) { notify(e.message || 'Export failed', 'err') }
    setBusy('')
  }

  const items = [
    ['xlsx', '📗', 'Excel workbook', 'Student summary, All marks, Test summary — 3 sheets.', () => exportExcel(data, subjects, students)],
    ['class', '📕', 'Class report (PDF)', 'Ranked class sheet with subject-wise percentages.', () => exportClassPdf(data, subjects, students)],
    ['cards', '🗂️', 'All result cards (PDF)', 'One page per student — print for the whole class.', () => exportAllResultCards(data, students)],
  ]

  return (
    <>
      <div className="page-head"><h1>Reports & downloads</h1></div>
      <div className="grid three">
        {items.map(([k, icon, title, desc, fn]) => (
          <div className="card report" key={k}>
            <div className="big-icon">{icon}</div>
            <h3>{title}</h3>
            <p className="muted">{desc}</p>
            <button className="btn primary" disabled={!!busy || !students.length} onClick={() => run(k, fn)}>{busy === k ? 'Preparing…' : 'Download'}</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Single student result card</h3>
        <div className="filters">
          <select value={sid} onChange={(e) => setSid(e.target.value)}>
            <option value="">Select student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.roll_no} — {s.name}</option>)}
          </select>
          <button className="btn primary" disabled={!sid || !!busy} onClick={() => run('one', () => exportResultCard(data.studentStats.get(sid), data.classPct))}>Download PDF</button>
        </div>
      </div>
    </>
  )
}
