import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { gradeOf, isPass, round1 } from './stats'

const fmt = (n) => (n == null ? '-' : `${round1(n)}%`)
const SCHOOL = 'Grade 9 - Result Card'

function save(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/* ---------------------------- EXCEL ---------------------------- */
export async function exportExcel(data, subjects, students) {
  let ExcelJS
  try {
    ExcelJS = (await import('exceljs')).default
  } catch {
    throw new Error('The app was updated. Please refresh the page (Ctrl+Shift+R) and try again.')
  }
  const wb = new ExcelJS.Workbook()

  const head = (ws) => {
    const r = ws.getRow(1)
    r.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // Sheet 1: student summary
  const ws1 = wb.addWorksheet('Student Summary')
  ws1.columns = [
    { header: 'Rank', key: 'rank', width: 7 },
    { header: 'Roll No', key: 'roll', width: 10 },
    { header: 'Name', key: 'name', width: 26 },
    ...subjects.map((s) => ({ header: s.name + ' %', key: s.id, width: 14 })),
    { header: 'Marks Obtained', key: 'obt', width: 15 },
    { header: 'Out Of', key: 'outof', width: 9 },
    { header: 'Overall %', key: 'overall', width: 12 },
    { header: 'Grade', key: 'grade', width: 8 },
  ]
  head(ws1)
  students.forEach((s) => {
    const st = data.studentStats.get(s.id)
    const row = { rank: st.rank ?? '', roll: s.roll_no, name: s.name, obt: st.testsTaken ? st.obtained : '', outof: st.testsTaken ? st.total : '', overall: round1(st.pct) ?? '', grade: gradeOf(st.pct) }
    subjects.forEach((sub) => {
      const x = st.subjects.find((y) => y.subject.id === sub.id)
      row[sub.id] = x ? round1(x.pct) : ''
    })
    ws1.addRow(row)
  })

  // Sheet 2: every test (long format)
  const ws2 = wb.addWorksheet('All Marks')
  ws2.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Subject', key: 'subject', width: 16 },
    { header: 'Test', key: 'test', width: 22 },
    { header: 'Teacher', key: 'teacher', width: 20 },
    { header: 'Roll No', key: 'roll', width: 10 },
    { header: 'Student', key: 'student', width: 26 },
    { header: 'Obtained', key: 'obt', width: 10 },
    { header: 'Total', key: 'total', width: 8 },
    { header: 'Percentage', key: 'pct', width: 11 },
    { header: 'Status', key: 'status', width: 10 },
  ]
  head(ws2)
  const sById = new Map(students.map((s) => [s.id, s]))
  data.testList.forEach((t) =>
    t.rows.forEach((r) => {
      const s = sById.get(r.student_id)
      ws2.addRow({
        date: t.test_date,
        subject: t.subject?.name,
        test: t.title,
        teacher: t.owner?.name,
        roll: s?.roll_no,
        student: s?.name,
        obt: r.present ? Number(r.obtained) : '',
        total: Number(t.total_marks),
        pct: r.present ? round1(r.pct) : '',
        status: !r.present ? 'Absent' : isPass(r.pct) ? 'Pass' : 'Fail',
      })
    }),
  )

  // Sheet 3: test summary
  const ws3 = wb.addWorksheet('Test Summary')
  ws3.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Subject', key: 'subject', width: 16 },
    { header: 'Test', key: 'test', width: 22 },
    { header: 'Total Marks', key: 'total', width: 12 },
    { header: 'Attempted', key: 'att', width: 11 },
    { header: 'Average %', key: 'avg', width: 11 },
    { header: 'Highest %', key: 'hi', width: 11 },
    { header: 'Lowest %', key: 'lo', width: 11 },
    { header: 'Pass rate %', key: 'pr', width: 12 },
  ]
  head(ws3)
  data.testList.forEach((t) =>
    ws3.addRow({ date: t.test_date, subject: t.subject?.name, test: t.title, total: Number(t.total_marks), att: t.attempted, avg: round1(t.avgPct) ?? '', hi: round1(t.highPct) ?? '', lo: round1(t.lowPct) ?? '', pr: round1(t.passRate) ?? '' }),
  )

  const buf = await wb.xlsx.writeBuffer()
  save(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'grade9-marks.xlsx')
}

/* ------------------------------ PDF ------------------------------ */
// jsPDF is bundled with the app (not lazy-loaded) so downloads keep working
// even if the site was redeployed while the page was open.
async function pdfLibs() {
  return { jsPDF, autoTable }
}

function drawResultCard(doc, autoTable, st, classPct) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255)
  doc.setFontSize(18)
  doc.text(SCHOOL, 14, 13)
  doc.setFontSize(10)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 21)

  doc.setTextColor(30)
  doc.setFontSize(14)
  doc.text(st.student.name, 14, 40)
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`Roll No: ${st.student.roll_no}    Section: ${st.student.section || '-'}`, 14, 46)

  const pass = isPass(st.pct)
  const boxes = [
    ['Overall', fmt(st.pct)],
    ['Grade', gradeOf(st.pct)],
    ['Class Rank', st.rank ? `${st.rank}` : '-'],
    ['Class Avg', fmt(classPct)],
    ['Result', st.pct == null ? '-' : pass ? 'PASS' : 'NEEDS WORK'],
  ]
  boxes.forEach(([k, v], i) => {
    const x = 14 + i * 37
    doc.setDrawColor(220)
    doc.setFillColor(248, 249, 252)
    doc.roundedRect(x, 52, 34, 20, 2, 2, 'FD')
    doc.setFontSize(8)
    doc.setTextColor(110)
    doc.text(k, x + 3, 58)
    doc.setFontSize(12)
    doc.setTextColor(30)
    doc.text(String(v), x + 3, 67)
  })

  doc.setFontSize(12)
  doc.setTextColor(30)
  doc.text('Subject-wise performance', 14, 84)
  autoTable(doc, {
    startY: 87,
    head: [['Subject', 'Tests', 'Marks', 'Percentage', 'Grade']],
    body: st.subjects.map((s) => [s.subject.name, s.tests, `${s.obtained} / ${s.total}`, fmt(s.pct), gradeOf(s.pct)]),
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
  })

  const y = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.text('Test-wise details', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Subject', 'Test', 'Marks', '%']],
    body: st.rows.map((r) => [r.test.test_date, r.test.subject?.name ?? '', r.test.title, r.present ? `${r.obtained} / ${r.test.total_marks}` : 'Absent', r.present ? fmt(r.pct) : '-']),
    headStyles: { fillColor: [100, 116, 139] },
    styles: { fontSize: 8 },
  })
}

export async function exportResultCard(st, classPct) {
  const { jsPDF, autoTable } = await pdfLibs()
  const doc = new jsPDF()
  drawResultCard(doc, autoTable, st, classPct)
  doc.save(`result-${st.student.roll_no}-${st.student.name.replace(/\s+/g, '_')}.pdf`)
}

export async function exportAllResultCards(data, students) {
  const { jsPDF, autoTable } = await pdfLibs()
  const doc = new jsPDF()
  students.forEach((s, i) => {
    if (i > 0) doc.addPage()
    drawResultCard(doc, autoTable, data.studentStats.get(s.id), data.classPct)
  })
  doc.save('grade9-all-result-cards.pdf')
}

export async function exportClassPdf(data, subjects, students) {
  const { jsPDF, autoTable } = await pdfLibs()
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Grade 9 - Class Performance Report', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Class average: ${fmt(data.classPct)}   |   Students: ${students.length}   |   Tests: ${data.testList.length}`, 14, 22)
  autoTable(doc, {
    startY: 27,
    head: [['Rank', 'Roll', 'Name', ...subjects.map((s) => s.name), 'Overall', 'Grade']],
    body: students
      .slice()
      .sort((a, b) => (data.studentStats.get(a.id).rank ?? 999) - (data.studentStats.get(b.id).rank ?? 999))
      .map((s) => {
        const st = data.studentStats.get(s.id)
        const cell = (x) => (x ? `${x.obtained}/${x.total} (${fmt(x.pct)})` : '-')
        return [st.rank ?? '-', s.roll_no, s.name, ...subjects.map((sub) => cell(st.subjects.find((x) => x.subject.id === sub.id))), st.testsTaken ? `${st.obtained}/${st.total} (${fmt(st.pct)})` : '-', gradeOf(st.pct)]
      }),
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 },
  })
  doc.save('grade9-class-report.pdf')
}
