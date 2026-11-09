import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, fetchAll } from './lib/supabase'
import { compute } from './lib/stats'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [raw, setRaw] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [students, subjects, tests, marks, profiles, assignments] = await Promise.all([
        fetchAll('students'),
        fetchAll('subjects'),
        fetchAll('tests'),
        fetchAll('marks'),
        fetchAll('profiles'),
        fetchAll('teacher_subjects'),
      ])
      students.sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }))
      subjects.sort((a, b) => a.name.localeCompare(b.name))
      setRaw({ students, subjects, tests, marks, profiles, assignments })
    } catch (e) {
      notify(e.message || 'Failed to load data', 'err')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    if (session) reload()
    else setRaw(null)
  }, [session, reload])

  const value = useMemo(() => {
    if (!raw || !session) return { session, loading, reload, notify, toast, ready: false }
    const me = raw.profiles.find((p) => p.id === session.user.id)
    const isAdmin = me?.role === 'admin'
    const mySubjectIds = new Set(raw.assignments.filter((a) => a.teacher_id === session.user.id).map((a) => a.subject_id))
    return {
      session,
      loading,
      reload,
      notify,
      toast,
      ready: true,
      me,
      isAdmin,
      mySubjectIds,
      ...raw,
      data: compute(raw),
    }
  }, [raw, session, loading, reload, notify, toast])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
