export const PASS_PERCENT = 50

export const round1 = (n) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10) / 10)

export function gradeOf(p) {
  if (p == null) return '-'
  if (p >= 90) return 'A+'
  if (p >= 80) return 'A'
  if (p >= 70) return 'B'
  if (p >= 60) return 'C'
  if (p >= PASS_PERCENT) return 'D'
  return 'F'
}

export function gradeColor(p) {
  if (p == null) return 'var(--muted)'
  if (p >= 80) return 'var(--green)'
  if (p >= 60) return 'var(--blue)'
  if (p >= PASS_PERCENT) return 'var(--amber)'
  return 'var(--red)'
}

const sum = (a) => a.reduce((s, x) => s + x, 0)
const avg = (a) => (a.length ? sum(a) / a.length : null)

/**
 * Turn raw tables into everything the UI needs.
 * Percentage of a test  = obtained / total_marks * 100  (absent students are excluded)
 * Overall / subject %   = sum(obtained) / sum(total_marks) of the tests attempted
 */
export function compute({ students, subjects, tests, marks, profiles }) {
  const subjectById = new Map(subjects.map((s) => [s.id, s]))
  const profileById = new Map(profiles.map((p) => [p.id, p]))
  const testById = new Map()
  const studentById = new Map(students.map((s) => [s.id, s]))

  tests.forEach((t) => {
    testById.set(t.id, {
      ...t,
      subject: subjectById.get(t.subject_id),
      owner: profileById.get(t.created_by),
      rows: [],
    })
  })

  const byStudent = new Map(students.map((s) => [s.id, []]))

  marks.forEach((m) => {
    const t = testById.get(m.test_id)
    if (!t || !studentById.has(m.student_id)) return
    const present = !m.absent && m.obtained != null
    const row = {
      ...m,
      present,
      pct: present ? (Number(m.obtained) / Number(t.total_marks)) * 100 : null,
      test: t,
    }
    t.rows.push(row)
    byStudent.get(m.student_id)?.push(row)
  })

  // test-level stats
  testById.forEach((t) => {
    const present = t.rows.filter((r) => r.present)
    const pcts = present.map((r) => r.pct)
    t.attempted = present.length
    t.absentCount = t.rows.length - present.length
    t.avgPct = avg(pcts)
    t.highPct = pcts.length ? Math.max(...pcts) : null
    t.lowPct = pcts.length ? Math.min(...pcts) : null
    t.passRate = pcts.length ? (pcts.filter((p) => p >= PASS_PERCENT).length / pcts.length) * 100 : null
  })

  // student-level stats
  const studentStats = new Map()
  students.forEach((s) => {
    const rows = (byStudent.get(s.id) || []).filter((r) => r.present)
    const obtained = sum(rows.map((r) => Number(r.obtained)))
    const total = sum(rows.map((r) => Number(r.test.total_marks)))
    const perSubject = new Map()
    rows.forEach((r) => {
      const k = r.test.subject_id
      if (!perSubject.has(k)) perSubject.set(k, { subject: r.test.subject, obtained: 0, total: 0, tests: 0 })
      const o = perSubject.get(k)
      o.obtained += Number(r.obtained)
      o.total += Number(r.test.total_marks)
      o.tests += 1
    })
    const subjectsArr = [...perSubject.values()]
      .map((o) => ({ ...o, pct: (o.obtained / o.total) * 100 }))
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name))
    studentStats.set(s.id, {
      student: s,
      rows: (byStudent.get(s.id) || []).slice().sort((a, b) => a.test.test_date.localeCompare(b.test.test_date)),
      testsTaken: rows.length,
      obtained,
      total,
      pct: total ? (obtained / total) * 100 : null,
      subjects: subjectsArr,
    })
  })

  // class rank
  const ranked = [...studentStats.values()].filter((s) => s.pct != null).sort((a, b) => b.pct - a.pct)
  ranked.forEach((s, i) => {
    s.rank = i + 1
  })

  // subject-level stats
  const subjectStats = subjects.map((sub) => {
    const subTests = [...testById.values()].filter((t) => t.subject_id === sub.id)
    const rows = subTests.flatMap((t) => t.rows).filter((r) => r.present)
    const obtained = sum(rows.map((r) => Number(r.obtained)))
    const total = sum(rows.map((r) => Number(r.test.total_marks)))
    return { subject: sub, tests: subTests.length, pct: total ? (obtained / total) * 100 : null }
  })

  const allRows = [...testById.values()].flatMap((t) => t.rows).filter((r) => r.present)
  const classPct = allRows.length
    ? (sum(allRows.map((r) => Number(r.obtained))) / sum(allRows.map((r) => Number(r.test.total_marks)))) * 100
    : null

  return {
    testById,
    studentStats,
    subjectStats,
    ranked,
    classPct,
    testList: [...testById.values()].sort((a, b) => b.test_date.localeCompare(a.test_date) || b.created_at.localeCompare(a.created_at)),
  }
}

// Subject->tests timeline helper for charts
export function testTrend(testList) {
  return testList
    .filter((t) => t.avgPct != null)
    .slice()
    .reverse()
    .map((t) => ({
      name: `${t.subject?.name ?? ''} · ${t.title}`.slice(0, 28),
      date: t.test_date,
      avg: round1(t.avgPct),
      high: round1(t.highPct),
      low: round1(t.lowPct),
    }))
}
