import { gradeColor, gradeOf, round1 } from '../lib/stats'

export function Pct({ v, grade }) {
  if (v == null) return <span className="muted">-</span>
  return (
    <span className="pct" style={{ color: gradeColor(v) }}>
      {round1(v)}%{grade && <i>{gradeOf(v)}</i>}
    </span>
  )
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <small>{label}</small>
      <b>{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>
}

export const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16']
