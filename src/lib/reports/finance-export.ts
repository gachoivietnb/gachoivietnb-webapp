import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'

export type FarmInfo = {
  name?: string
  address?: string
  phone?: string
}

export type ReportSection = {
  title: string
  headers: string[]
  rows: Array<Array<string | number>>
  footer?: Array<string | number>
  rightAlign?: number[]
}

export type ReportMeta = {
  title: string
  subtitle?: string
  period?: string
  summary?: Array<[string, string]>
  // Khối chữ ký cuối báo cáo (VD: [{role:'Người lập', name:'...'}, {role:'Chủ trang trại', name:'...'}])
  signatures?: Array<{ role: string; name: string }>
}

function todayVN(): string {
  const d = new Date()
  return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
}

// =====================================================
// EXCEL — ExcelJS với styling pro: branded header, sticky table, number formats, alternating rows
// =====================================================

export async function buildExcel(
  meta: ReportMeta,
  sections: ReportSection[],
  farm: FarmInfo
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = farm.name ?? 'Gà Chọi Việt NB'
  wb.created = new Date()

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]
    const safeName = sec.title.slice(0, 28).replace(/[/\\?*[\]]/g, '') || `Sheet${i + 1}`
    const ws = wb.addWorksheet(safeName)

    const lastCol = Math.max(sec.headers.length, 3)
    const colLetters = (n: number): string => {
      let s = ''
      let v = n
      while (v > 0) {
        const r = (v - 1) % 26
        s = String.fromCharCode(65 + r) + s
        v = Math.floor((v - 1) / 26)
      }
      return s
    }
    const endCol = colLetters(lastCol)

    // 1. Farm branding
    ws.mergeCells(`A1:${endCol}1`)
    const c1 = ws.getCell('A1')
    c1.value = farm.name ?? 'Gà Chọi Việt NB'
    c1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E40AF' } }
    c1.alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getRow(1).height = 24

    ws.mergeCells(`A2:${endCol}2`)
    const c2 = ws.getCell('A2')
    c2.value = `${farm.address ?? ''}${farm.phone ? ' · ' + farm.phone : ''}`
    c2.font = { name: 'Arial', size: 9, color: { argb: 'FF6B7280' } }

    // 3. Title
    ws.mergeCells(`A4:${endCol}4`)
    const c4 = ws.getCell('A4')
    c4.value = meta.title
    c4.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF111827' } }
    c4.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(4).height = 22

    let curRow = 5
    if (meta.subtitle) {
      ws.mergeCells(`A${curRow}:${endCol}${curRow}`)
      const cc = ws.getCell(`A${curRow}`)
      cc.value = meta.subtitle
      cc.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } }
      cc.alignment = { horizontal: 'center' }
      curRow++
    }
    ws.mergeCells(`A${curRow}:${endCol}${curRow}`)
    const cd = ws.getCell(`A${curRow}`)
    cd.value = `${meta.period ? 'Kỳ báo cáo: ' + meta.period + '  ·  ' : ''}Xuất ngày: ${new Date().toLocaleDateString(
      'vi-VN'
    )}`
    cd.font = { name: 'Arial', size: 9, color: { argb: 'FF6B7280' } }
    cd.alignment = { horizontal: 'center' }
    curRow++

    if (i === 0 && meta.summary && meta.summary.length > 0) {
      curRow++
      for (const [k, v] of meta.summary) {
        ws.mergeCells(`A${curRow}:B${curRow}`)
        const lbl = ws.getCell(`A${curRow}`)
        lbl.value = k
        lbl.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF374151' } }
        lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
        lbl.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
        lbl.border = thinBorder('FFE5E7EB')
        const val = ws.getCell(`C${curRow}`)
        val.value = v
        val.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } }
        val.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
        val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
        val.border = thinBorder('FFE5E7EB')
        if (lastCol > 3) ws.mergeCells(`C${curRow}:${endCol}${curRow}`)
        ws.getRow(curRow).height = 24
        curRow++
      }
    }
    curRow++

    // Section title bar
    ws.mergeCells(`A${curRow}:${endCol}${curRow}`)
    const st = ws.getCell(`A${curRow}`)
    st.value = sec.title
    st.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    st.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    ws.getRow(curRow).height = 26
    curRow++

    // Table header
    const headerRowIdx = curRow
    const headerRow = ws.getRow(curRow)
    sec.headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = h
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
      cell.alignment = {
        horizontal: sec.rightAlign?.includes(idx) ? 'right' : idx === 0 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
        indent: idx === 0 ? 1 : 0,
      }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
        right: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      }
    })
    headerRow.height = 28
    curRow++

    // Body rows with alternating stripes
    sec.rows.forEach((r, rIdx) => {
      const row = ws.getRow(curRow)
      r.forEach((v, idx) => {
        const cell = row.getCell(idx + 1)
        cell.value = v
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } }
        cell.alignment = {
          horizontal: sec.rightAlign?.includes(idx) ? 'right' : 'left',
          vertical: 'middle',
          indent: idx === 0 ? 1 : 0,
          wrapText: idx === 0,
        }
        if (sec.rightAlign?.includes(idx) && typeof v === 'number') {
          cell.numFmt = '#,##0;[Red]-#,##0;0'
        }
        cell.border = {
          top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        }
        if (rIdx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          }
        }
      })
      row.height = 20
      curRow++
    })

    // Footer row
    if (sec.footer) {
      const fRow = ws.getRow(curRow)
      sec.footer.forEach((v, idx) => {
        const cell = fRow.getCell(idx + 1)
        cell.value = v
        cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF92400E' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
        cell.alignment = {
          horizontal: sec.rightAlign?.includes(idx) ? 'right' : 'left',
          vertical: 'middle',
          indent: idx === 0 ? 1 : 0,
        }
        if (sec.rightAlign?.includes(idx) && typeof v === 'number') {
          cell.numFmt = '#,##0;[Red]-#,##0;0'
        }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF92400E' } },
          bottom: { style: 'medium', color: { argb: 'FF92400E' } },
          left: { style: 'thin', color: { argb: 'FFFCD34D' } },
          right: { style: 'thin', color: { argb: 'FFFCD34D' } },
        }
      })
      fRow.height = 24
    }

    // Signatures (chỉ ở sheet cuối): Người lập / Chủ trang trại
    if (i === sections.length - 1 && meta.signatures && meta.signatures.length > 0) {
      const sigs = meta.signatures.slice(0, 2)
      const midCol = Math.min(lastCol, Math.max(2, Math.ceil(lastCol / 2)))
      const midL = colLetters(midCol)
      const rStartL = colLetters(Math.min(lastCol, midCol + 1))
      let sr = curRow + 3
      ws.mergeCells(`${rStartL}${sr}:${endCol}${sr}`)
      const dc = ws.getCell(`${rStartL}${sr}`)
      dc.value = todayVN()
      dc.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } }
      dc.alignment = { horizontal: 'center' }
      sr += 1
      const putPair = (row: number, left: string, right: string | undefined, font: Partial<ExcelJS.Font>) => {
        ws.mergeCells(`A${row}:${midL}${row}`)
        const lc = ws.getCell(`A${row}`)
        lc.value = left
        lc.font = font
        lc.alignment = { horizontal: 'center' }
        if (right !== undefined && sigs.length > 1) {
          ws.mergeCells(`${rStartL}${row}:${endCol}${row}`)
          const rc = ws.getCell(`${rStartL}${row}`)
          rc.value = right
          rc.font = font
          rc.alignment = { horizontal: 'center' }
        }
      }
      putPair(sr, sigs[0].role.toUpperCase(), sigs[1]?.role.toUpperCase(), { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111827' } })
      putPair(sr + 1, '(Ký, ghi rõ họ tên)', sigs[1] ? '(Ký, ghi rõ họ tên)' : undefined, { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } })
      putPair(sr + 4, sigs[0].name || '', sigs[1]?.name || '', { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111827' } })
      curRow = sr + 5
    }

    // Freeze panes at top of table
    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]

    // Auto column widths
    ws.columns.forEach((col, idx) => {
      let max = 8
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length
        if (len > max) max = len
      })
      col.width = Math.min(Math.max(idx === 0 ? 24 : 14, max + 3), 46)
    })

    // Print setup
    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    }
  }

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer
  return Buffer.from(buffer)
}

function thinBorder(colorArgb: string): ExcelJS.Borders {
  return {
    top: { style: 'thin', color: { argb: colorArgb } },
    bottom: { style: 'thin', color: { argb: colorArgb } },
    left: { style: 'thin', color: { argb: colorArgb } },
    right: { style: 'thin', color: { argb: colorArgb } },
  } as ExcelJS.Borders
}

// =====================================================
// PDF — jsPDF + Roboto font (hỗ trợ tiếng Việt)
// =====================================================

let cachedFonts: { regular: string; bold: string } | null = null

export function loadRobotoFonts(): { regular: string; bold: string } {
  if (cachedFonts) return cachedFonts
  const fontDir = path.join(process.cwd(), 'public', 'fonts')
  const regular = fs.readFileSync(path.join(fontDir, 'Roboto-Regular.ttf')).toString('base64')
  const bold = fs.readFileSync(path.join(fontDir, 'Roboto-Bold.ttf')).toString('base64')
  cachedFonts = { regular, bold }
  return cachedFonts
}

export function registerRoboto(doc: jsPDF) {
  const { regular, bold } = loadRobotoFonts()
  doc.addFileToVFS('Roboto-Regular.ttf', regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  // Alias italic + bolditalic về cùng file Regular/Bold — không có file italic
  // riêng nhưng tránh được việc jsPDF/autoTable fallback về helvetica khi gặp
  // fontStyle='italic' (helvetica không có dấu tiếng Việt → bị vỡ chữ).
  // Trade-off: text "italic" sẽ không thực sự nghiêng nhưng tiếng Việt OK.
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'italic')
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bolditalic')
  doc.setFont('Roboto', 'normal')
}

export function buildPdf(
  meta: ReportMeta,
  sections: ReportSection[],
  farm: FarmInfo
): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  registerRoboto(doc)

  // Branding bar top
  doc.setFillColor(239, 246, 255)
  doc.rect(0, 0, 297, 26, 'F')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(30, 64, 175)
  doc.text(farm.name ?? 'Gà Chọi Việt NB', 14, 14)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`${farm.address ?? ''}${farm.phone ? '   ·   ' + farm.phone : ''}`, 14, 20)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(17, 24, 39)
  doc.text(meta.title, 283, 14, { align: 'right' })

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(75, 85, 99)
  const datelineParts = [
    meta.period && `Kỳ báo cáo: ${meta.period}`,
    meta.subtitle,
    `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
  ].filter(Boolean)
  doc.text(datelineParts.join('   ·   '), 283, 20, { align: 'right' })

  // Bottom border of branding bar
  doc.setDrawColor(191, 219, 254)
  doc.setLineWidth(0.3)
  doc.line(0, 26, 297, 26)

  let y = 32

  // Summary KPI strip
  if (meta.summary && meta.summary.length > 0) {
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      body: meta.summary.map(([k, v]) => [k, v]),
      columnStyles: {
        0: {
          cellWidth: 80,
          fontStyle: 'bold',
          fillColor: [243, 244, 246],
          textColor: [55, 65, 81],
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
        },
        1: {
          halign: 'right',
          textColor: [30, 64, 175],
          fontStyle: 'bold',
          fillColor: [239, 246, 255],
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
        },
      },
      styles: {
        font: 'Roboto',
        fontSize: 10,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
      },
      margin: { left: 14, right: 14 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // Sections
  for (const sec of sections) {
    if (y > 180) {
      doc.addPage()
      y = 15
    }

    // Section title bar
    doc.setFillColor(30, 64, 175)
    doc.rect(14, y, 269, 8, 'F')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text(sec.title, 17, y + 5.5)
    y += 10

    const columnStyles: Record<number, { halign?: 'right' | 'center' | 'left' }> = {}
    for (const idx of sec.rightAlign ?? []) columnStyles[idx] = { halign: 'right' }

    autoTable(doc, {
      startY: y,
      head: [sec.headers],
      body: sec.rows.map((r) => r.map((v) => (typeof v === 'number' ? fmtNum(v) : v))),
      foot: sec.footer
        ? [sec.footer.map((v) => (typeof v === 'number' ? fmtNum(v) : v))]
        : undefined,
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontSize: 9,
        cellPadding: 2.8,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
        textColor: [17, 24, 39],
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        font: 'Roboto',
        halign: 'center',
        valign: 'middle',
        cellPadding: 3,
      },
      bodyStyles: { font: 'Roboto', valign: 'middle' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      footStyles: {
        fillColor: [254, 243, 199],
        textColor: [146, 64, 14],
        fontStyle: 'bold',
        font: 'Roboto',
        cellPadding: 3,
      },
      columnStyles,
      margin: { left: 14, right: 14 },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // Signature block (optional): Người lập / Chủ trang trại
  if (meta.signatures && meta.signatures.length > 0) {
    if (y + 42 > 196) {
      doc.addPage()
      y = 20
    } else {
      y += 8
    }
    const sigs = meta.signatures.slice(0, 2)
    const centers = sigs.length > 1 ? [75, 222] : [148]
    doc.setFont('Roboto', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(75, 85, 99)
    doc.text(todayVN(), centers[centers.length - 1], y, { align: 'center' })
    y += 7
    sigs.forEach((s, idx) => {
      const cx = centers[idx]
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(17, 24, 39)
      doc.text(s.role.toUpperCase(), cx, y, { align: 'center' })
      doc.setFont('Roboto', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(107, 114, 128)
      doc.text('(Ký, ghi rõ họ tên)', cx, y + 5, { align: 'center' })
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(17, 24, 39)
      doc.text(s.name || '.....................', cx, y + 26, { align: 'center' })
    })
    y += 30
  }

  // Footer on each page
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.2)
    doc.line(14, 200, 283, 200)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(`${farm.name ?? 'Gà Chọi Việt NB'}`, 14, 204)
    doc.text(`Trang ${i}/${pageCount}`, 283, 204, { align: 'right' })
  }

  return doc.output('arraybuffer')
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}
