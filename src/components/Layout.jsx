import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../AppContext'

export default function Layout({ children }) {
  const { me, isAdmin, toast, loading, reload } = useApp()
  const links = [
    ['/', '📊', 'Overview'],
    ['/tests', '📝', 'Tests'],
    ['/class', '🏫', 'Class'],
    ['/students', '🎓', 'Students'],
    ['/reports', '📄', 'Reports'],
    ...(isAdmin ? [['/admin', '⚙️', 'Admin']] : []),
  ]
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">9</span>
          <div>
            <b>Grade 9</b>
            <small>Marks Dashboard</small>
          </div>
        </div>
        <nav>
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{icon}</span>
              <em>{label}</em>
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <div>
            <b>{me?.name || 'User'}</b>
            <small>{isAdmin ? 'Admin' : 'Teacher'}</small>
          </div>
          <button className="btn ghost sm" onClick={reload} disabled={loading} title="Refresh data">↻</button>
          <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
      </aside>
      <main className="main">{children}</main>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
