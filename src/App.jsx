import { Navigate, Route, Routes } from 'react-router-dom'
import { configured } from './lib/supabase'
import { AppProvider, useApp } from './AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Tests from './pages/Tests'
import TestDetail from './pages/TestDetail'
import ClassView from './pages/ClassView'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import Reports from './pages/Reports'
import Admin from './pages/Admin'

function SetupNotice() {
  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Setup needed</h2>
        <p className="muted">
          Supabase keys were not found. Create a <code>.env</code> file in the project folder (copy of <code>.env.example</code>) and set
          <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>. On Vercel, add the same two values as Environment Variables.
        </p>
      </div>
    </div>
  )
}

function Gate() {
  const app = useApp()
  if (app.session === undefined) return <div className="center-screen"><div className="spinner" /></div>
  if (!app.session) return <Login />
  if (!app.ready) return <div className="center-screen"><div className="spinner" /></div>
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/tests/:id" element={<TestDetail />} />
        <Route path="/class" element={<ClassView />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={app.isAdmin ? <Admin /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  if (!configured) return <SetupNotice />
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  )
}
