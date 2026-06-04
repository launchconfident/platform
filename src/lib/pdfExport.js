import jsPDF from 'jspdf'

export async function exportAuditPDF({ audit, product, sections, checkedIds, earnedPoints, totalPoints }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 20
  let y = margin

  const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const date = new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })

  // Header
  doc.setFillColor(255, 90, 141)
  doc.rect(0, 0, W, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Launch Confident', margin, 15)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(product?.name || '', margin, 23)
  doc.text(audit?.name || '', margin, 30)

  y = 46

  // Score summary
  doc.setTextColor(19, 18, 18)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`Totalresultat: ${earnedPoints}/${totalPoints} poäng (${pct}%)`, margin, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(155, 143, 133)
  doc.text(`Exporterad ${date}`, margin, y)
  y += 12

  // Divider
  doc.setDrawColor(240, 235, 227)
  doc.line(margin, y, W - margin, y)
  y += 8

  for (const section of sections) {
    let sEarned = 0, sTotal = 0
    for (const item of section.checklist_items) {
      sTotal += item.points || 0
      if (checkedIds.has(item.id)) sEarned += item.points || 0
    }
    const sPct = sTotal > 0 ? Math.round((sEarned / sTotal) * 100) : 0

    // Section header
    if (y > 265) { doc.addPage(); y = margin }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(19, 18, 18)
    doc.text(section.title, margin, y)

    const scoreColor = sPct >= 70 ? [22, 163, 74] : sPct >= 40 ? [217, 119, 6] : [250, 108, 120]
    doc.setTextColor(...scoreColor)
    doc.setFontSize(10)
    doc.text(`${sEarned}/${sTotal}p (${sPct}%)`, W - margin, y, { align: 'right' })
    y += 7

    for (const item of section.checklist_items) {
      if (y > 270) { doc.addPage(); y = margin }
      const done = checkedIds.has(item.id)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(done ? 155 : 19, done ? 143 : 18, done ? 133 : 18)
      const prefix = done ? '✓ ' : '○ '
      const lines = doc.splitTextToSize(prefix + item.label, W - margin * 2 - 12)
      doc.text(lines, margin + 4, y)
      doc.setTextColor(155, 143, 133)
      doc.setFontSize(8)
      doc.text(`${item.points}p`, W - margin, y, { align: 'right' })
      y += lines.length * 4.5 + 1
    }

    y += 4
    doc.setDrawColor(240, 235, 227)
    doc.line(margin, y, W - margin, y)
    y += 6
  }

  doc.save(`${audit?.name || 'audit'}.pdf`)
}
