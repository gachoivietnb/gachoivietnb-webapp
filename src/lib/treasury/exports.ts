import 'server-only'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerRoboto } from '@/lib/reports/finance-export'
import { CATEGORY_META, type CashTransaction, type Direction } from './types'

/* ============================================================
 * TREASURY EXPORTS — chuẩn kế toán VN (Sổ quỹ, Nhật ký thu, Nhật ký chi)
 *
 * 3 báo cáo × 2 format = 6 hàm.
 * Reuse Roboto fonts từ finance-export.ts cho tiếng Việt.
 * ============================================================ */

export type ReportKind = 'cash_book' | 'receipt_journal' | 'disbursement_journal'
export type Format = 'excel' | 'pdf'

export type FarmInfo = {
  name: string
  address?: string | null
  phone?: string | null
  tax_code?: string | null
}

export type AccountLite = {
  id: string
  name: string
  account_type: string
  bank_name?: string | null
  account_number?: string | null
}

export type ExportData = {
  farm: FarmInfo
  fromDate: string
  toDate: string
  account?: AccountLite | null  // null = tổng tất cả
  openingBalance: number
  closingBalance: number
  txs: Array<
    CashTransaction & {
      account_name: string | null
      account_icon: string | null
      account_color: string | null
      expense_category_name: string | null
    }
  >
}

const REPORT_TITLES: Record<ReportKind, string> = {
  cash_book: 'SỔ QUỸ TIỀN MẶT',
  receipt_journal: 'NHẬT KÝ THU TIỀN',
  disbursement_journal: 'NHẬT KÝ CHI TIỀN',
}

const REPORT_CODES: Record<ReportKind, string> = {
  cash_book: '',
  receipt_journal: '',
  disbursement_journal: '',
}

function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN')
}

function formatDate(s: string): string {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function ctNumber(direction: Direction, idx: number): string {
  // Phiếu Thu (PT) / Phiếu Chi (PC)
  return `${direction === 'in' ? 'PT' : 'PC'}${idx.toString().padStart(4, '0')}`
}

function categoryLabel(cat: CashTransaction['category']): string {
  return CATEGORY_META[cat]?.label ?? cat
}

/* ============================================================
 * EXCEL — exceljs với branded header, ký tên block
 * ============================================================ */

export async function buildExcel(kind: ReportKind, data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.farm.name
  wb.created = new Date()

  if (kind === 'cash_book') {
    await buildCashBookSheet(wb, data)
  } else if (kind === 'receipt_journal') {
    await buildJournalSheet(wb, data, 'in')
  } else {
    await buildJournalSheet(wb, data, 'out')
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

async function buildCashBookSheet(wb: ExcelJS.Workbook, data: ExportData): Promise<void> {
  const ws = wb.addWorksheet('Sổ quỹ', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  })

  // Cột: STT | Ngày | Số CT | Diễn giải | TK đối ứng | Thu | Chi | Tồn
  ws.columns = [
    { width: 5 },   // STT
    { width: 11 },  // Ngày
    { width: 10 },  // Số CT
    { width: 38 },  // Diễn giải
    { width: 18 },  // TK đối ứng
    { width: 16 },  // Thu
    { width: 16 },  // Chi
    { width: 18 },  // Tồn
  ]

  // 1. Header công ty (góc trái)
  let r = 1
  const farmCell = ws.getCell(r, 1)
  farmCell.value = `Đơn vị: ${data.farm.name}`
  farmCell.font = { name: 'Times New Roman', size: 10, bold: true }
  ws.mergeCells(r, 1, r, 4)

  // Mẫu số (góc phải)
  const codeCell = ws.getCell(r, 7)
  codeCell.value = REPORT_CODES.cash_book
  codeCell.font = { name: 'Times New Roman', size: 10, italic: true }
  codeCell.alignment = { horizontal: 'right' }
  ws.mergeCells(r, 7, r, 8)

  r++
  if (data.farm.address) {
    const addr = ws.getCell(r, 1)
    addr.value = `Địa chỉ: ${data.farm.address}`
    addr.font = { name: 'Times New Roman', size: 9 }
    ws.mergeCells(r, 1, r, 4)
  }

  // 2. Tiêu đề báo cáo
  r += 2
  const titleCell = ws.getCell(r, 1)
  titleCell.value = 'SỔ QUỸ TIỀN MẶT'
  titleCell.font = { name: 'Times New Roman', size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center' }
  ws.mergeCells(r, 1, r, 8)

  r++
  const accLabel = data.account
    ? `Tài khoản: ${data.account.name}${data.account.account_number ? ' — ' + data.account.account_number : ''}`
    : 'Tài khoản: Tất cả các quỹ'
  const accCell = ws.getCell(r, 1)
  accCell.value = accLabel
  accCell.font = { name: 'Times New Roman', size: 11, italic: true }
  accCell.alignment = { horizontal: 'center' }
  ws.mergeCells(r, 1, r, 8)

  r++
  const periodCell = ws.getCell(r, 1)
  periodCell.value = `Từ ngày ${formatDate(data.fromDate)} đến ngày ${formatDate(data.toDate)}`
  periodCell.font = { name: 'Times New Roman', size: 11 }
  periodCell.alignment = { horizontal: 'center' }
  ws.mergeCells(r, 1, r, 8)

  r += 2

  // 3. Header bảng
  const headerRow = r
  const headers = ['STT', 'Ngày', 'Số CT', 'Diễn giải', 'TK đối ứng', 'Thu', 'Chi', 'Tồn']
  headers.forEach((h, i) => {
    const c = ws.getCell(headerRow, i + 1)
    c.value = h
    c.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = thinBorder()
  })
  r++

  // 4. Số dư đầu kỳ
  const openingRow = r
  ws.getCell(openingRow, 4).value = 'Số dư đầu kỳ'
  ws.getCell(openingRow, 4).font = { name: 'Times New Roman', size: 10, italic: true }
  ws.mergeCells(openingRow, 1, openingRow, 5)
  setNum(ws.getCell(openingRow, 8), data.openingBalance, true)
  for (let c = 1; c <= 8; c++) {
    ws.getCell(openingRow, c).border = thinBorder()
    if (c >= 4 && c <= 8) {
      ws.getCell(openingRow, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      }
    }
  }
  r++

  // 5. Giao dịch — sắp xếp theo ngày tăng
  const sorted = [...data.txs].sort((a, b) =>
    a.transaction_date < b.transaction_date
      ? -1
      : a.transaction_date > b.transaction_date
        ? 1
        : a.created_at < b.created_at
          ? -1
          : 1
  )

  let running = data.openingBalance
  let totalIn = 0
  let totalOut = 0
  let inIdx = 0
  let outIdx = 0

  sorted.forEach((t, i) => {
    if (t.direction === 'in') {
      inIdx++
      totalIn += t.amount
      running += t.amount
    } else {
      outIdx++
      totalOut += t.amount
      running -= t.amount
    }

    ws.getCell(r, 1).value = i + 1
    ws.getCell(r, 1).alignment = { horizontal: 'center' }

    ws.getCell(r, 2).value = formatDate(t.transaction_date)
    ws.getCell(r, 2).alignment = { horizontal: 'center' }

    ws.getCell(r, 3).value = ctNumber(t.direction, t.direction === 'in' ? inIdx : outIdx)
    ws.getCell(r, 3).alignment = { horizontal: 'center' }

    ws.getCell(r, 4).value = t.description || categoryLabel(t.category)

    const counter = data.account
      ? categoryLabel(t.category)
      : `${t.account_name ?? '—'} / ${categoryLabel(t.category)}`
    ws.getCell(r, 5).value = counter

    if (t.direction === 'in') {
      setNum(ws.getCell(r, 6), t.amount)
      ws.getCell(r, 7).value = ''
    } else {
      ws.getCell(r, 6).value = ''
      setNum(ws.getCell(r, 7), t.amount)
    }
    setNum(ws.getCell(r, 8), running)

    for (let c = 1; c <= 8; c++) {
      ws.getCell(r, c).font = { name: 'Times New Roman', size: 10 }
      ws.getCell(r, c).border = thinBorder()
    }
    if (i % 2 === 1) {
      for (let c = 1; c <= 8; c++) {
        ws.getCell(r, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        }
      }
    }
    r++
  })

  // 6. Cộng phát sinh
  const sumRow = r
  ws.getCell(sumRow, 4).value = 'Cộng phát sinh trong kỳ'
  ws.getCell(sumRow, 4).font = { name: 'Times New Roman', size: 10, bold: true }
  ws.mergeCells(sumRow, 1, sumRow, 5)
  setNum(ws.getCell(sumRow, 6), totalIn, true)
  setNum(ws.getCell(sumRow, 7), totalOut, true)
  ws.getCell(sumRow, 8).value = ''
  for (let c = 1; c <= 8; c++) {
    ws.getCell(sumRow, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' },
    }
    ws.getCell(sumRow, c).border = thinBorder()
  }
  r++

  // 7. Số dư cuối kỳ
  const closingRow = r
  ws.getCell(closingRow, 4).value = 'Số dư cuối kỳ'
  ws.getCell(closingRow, 4).font = { name: 'Times New Roman', size: 10, italic: true, bold: true }
  ws.mergeCells(closingRow, 1, closingRow, 5)
  setNum(ws.getCell(closingRow, 8), data.closingBalance, true)
  for (let c = 1; c <= 8; c++) {
    ws.getCell(closingRow, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' },
    }
    ws.getCell(closingRow, c).border = thinBorder()
  }
  r += 3

  // 8. Ký tên
  appendSignatureBlock(ws, r)
}

async function buildJournalSheet(
  wb: ExcelJS.Workbook,
  data: ExportData,
  direction: Direction
): Promise<void> {
  const sheetName = direction === 'in' ? 'Nhật ký thu' : 'Nhật ký chi'
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  })

  // STT | Ngày | Số CT | Người nộp/nhận | Diễn giải | Số tiền | Tài khoản | Phân loại
  ws.columns = [
    { width: 5 },
    { width: 11 },
    { width: 10 },
    { width: 22 },
    { width: 35 },
    { width: 17 },
    { width: 18 },
    { width: 16 },
  ]

  // Header
  let r = 1
  const farmCell = ws.getCell(r, 1)
  farmCell.value = `Đơn vị: ${data.farm.name}`
  farmCell.font = { name: 'Times New Roman', size: 10, bold: true }
  ws.mergeCells(r, 1, r, 4)

  const codeCell = ws.getCell(r, 7)
  codeCell.value = direction === 'in' ? REPORT_CODES.receipt_journal : REPORT_CODES.disbursement_journal
  codeCell.font = { name: 'Times New Roman', size: 10, italic: true }
  codeCell.alignment = { horizontal: 'right' }
  ws.mergeCells(r, 7, r, 8)

  r++
  if (data.farm.address) {
    ws.getCell(r, 1).value = `Địa chỉ: ${data.farm.address}`
    ws.getCell(r, 1).font = { name: 'Times New Roman', size: 9 }
    ws.mergeCells(r, 1, r, 4)
  }

  r += 2
  ws.getCell(r, 1).value = direction === 'in' ? 'NHẬT KÝ THU TIỀN' : 'NHẬT KÝ CHI TIỀN'
  ws.getCell(r, 1).font = { name: 'Times New Roman', size: 16, bold: true }
  ws.getCell(r, 1).alignment = { horizontal: 'center' }
  ws.mergeCells(r, 1, r, 8)

  r++
  const accLabel = data.account
    ? `Tài khoản: ${data.account.name}`
    : 'Tài khoản: Tất cả các quỹ'
  ws.getCell(r, 1).value = accLabel
  ws.getCell(r, 1).font = { name: 'Times New Roman', size: 11, italic: true }
  ws.getCell(r, 1).alignment = { horizontal: 'center' }
  ws.mergeCells(r, 1, r, 8)

  r++
  ws.getCell(r, 1).value = `Từ ngày ${formatDate(data.fromDate)} đến ngày ${formatDate(data.toDate)}`
  ws.getCell(r, 1).font = { name: 'Times New Roman', size: 11 }
  ws.getCell(r, 1).alignment = { horizontal: 'center' }
  ws.mergeCells(r, 1, r, 8)

  r += 2

  // Header bảng
  const headers = [
    'STT',
    'Ngày',
    'Số CT',
    direction === 'in' ? 'Người/đơn vị nộp' : 'Người/đơn vị nhận',
    'Diễn giải',
    'Số tiền',
    'Tài khoản quỹ',
    'Phân loại',
  ]
  const headerRow = r
  headers.forEach((h, i) => {
    const c = ws.getCell(headerRow, i + 1)
    c.value = h
    c.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: direction === 'in' ? 'FF059669' : 'FFDC2626' },
    }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = thinBorder()
  })
  r++

  // Body
  const filtered = data.txs
    .filter((t) => t.direction === direction)
    .sort((a, b) =>
      a.transaction_date < b.transaction_date
        ? -1
        : a.transaction_date > b.transaction_date
          ? 1
          : a.created_at < b.created_at
            ? -1
            : 1
    )

  let total = 0
  filtered.forEach((t, i) => {
    total += t.amount
    ws.getCell(r, 1).value = i + 1
    ws.getCell(r, 1).alignment = { horizontal: 'center' }
    ws.getCell(r, 2).value = formatDate(t.transaction_date)
    ws.getCell(r, 2).alignment = { horizontal: 'center' }
    ws.getCell(r, 3).value = ctNumber(direction, i + 1)
    ws.getCell(r, 3).alignment = { horizontal: 'center' }
    ws.getCell(r, 4).value = extractParty(t.description, direction)
    ws.getCell(r, 5).value = t.description || categoryLabel(t.category)
    setNum(ws.getCell(r, 6), t.amount)
    ws.getCell(r, 7).value = t.account_name ?? '—'
    ws.getCell(r, 8).value = categoryLabel(t.category)

    for (let c = 1; c <= 8; c++) {
      ws.getCell(r, c).font = { name: 'Times New Roman', size: 10 }
      ws.getCell(r, c).border = thinBorder()
    }
    if (i % 2 === 1) {
      for (let c = 1; c <= 8; c++) {
        ws.getCell(r, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        }
      }
    }
    r++
  })

  // Tổng cộng
  const sumRow = r
  ws.getCell(sumRow, 5).value = `Tổng cộng (${filtered.length} bút toán)`
  ws.getCell(sumRow, 5).font = { name: 'Times New Roman', size: 10, bold: true }
  ws.getCell(sumRow, 5).alignment = { horizontal: 'right' }
  ws.mergeCells(sumRow, 1, sumRow, 5)
  setNum(ws.getCell(sumRow, 6), total, true)
  ws.mergeCells(sumRow, 7, sumRow, 8)

  for (let c = 1; c <= 8; c++) {
    ws.getCell(sumRow, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: direction === 'in' ? 'FFD1FAE5' : 'FFFEE2E2' },
    }
    ws.getCell(sumRow, c).border = thinBorder()
  }
  r += 3

  appendSignatureBlock(ws, r)
}

function appendSignatureBlock(ws: ExcelJS.Worksheet, startRow: number): void {
  const r = startRow
  // Ngày in
  ws.getCell(r, 6).value = `Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`
  ws.getCell(r, 6).font = { name: 'Times New Roman', size: 10, italic: true }
  ws.getCell(r, 6).alignment = { horizontal: 'center' }
  ws.mergeCells(r, 6, r, 8)

  // 3 chữ ký
  const sigRow = r + 1
  const labels = ['Người lập biểu', 'Kế toán trưởng', 'Giám đốc']
  const colsStart = [1, 4, 7]
  labels.forEach((l, i) => {
    const c = ws.getCell(sigRow, colsStart[i])
    c.value = l
    c.font = { name: 'Times New Roman', size: 10, bold: true }
    c.alignment = { horizontal: 'center' }
    if (i < 2) ws.mergeCells(sigRow, colsStart[i], sigRow, colsStart[i + 1] - 1)
    else ws.mergeCells(sigRow, colsStart[i], sigRow, 8)
  })
  const subRow = sigRow + 1
  labels.forEach((_, i) => {
    const c = ws.getCell(subRow, colsStart[i])
    c.value = '(Ký, họ tên)'
    c.font = { name: 'Times New Roman', size: 9, italic: true }
    c.alignment = { horizontal: 'center' }
    if (i < 2) ws.mergeCells(subRow, colsStart[i], subRow, colsStart[i + 1] - 1)
    else ws.mergeCells(subRow, colsStart[i], subRow, 8)
  })
}

function thinBorder(): ExcelJS.Borders {
  const style: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCBD5E1' } }
  return {
    top: style,
    left: style,
    right: style,
    bottom: style,
    diagonal: { up: false, down: false },
  } as ExcelJS.Borders
}

function setNum(cell: ExcelJS.Cell, n: number, bold = false): void {
  cell.value = n
  cell.numFmt = '#,##0'
  cell.alignment = { horizontal: 'right' }
  cell.font = { name: 'Times New Roman', size: 10, bold }
}

function extractParty(desc: string | null, direction: Direction): string {
  // Cố gắng đoán "khách hàng" / "nhà cung cấp" từ description.
  // Nếu không đoán được, để trống.
  if (!desc) return ''
  const m = desc.match(direction === 'in' ? /(khách|anh|chị|cô|bác|ông|bà)\s+([^\s,;.]+)/i : /(supplier|nhà cung cấp|anh|chị)\s+([^\s,;.]+)/i)
  return m ? m[0] : ''
}

/* ============================================================
 * PDF — jsPDF + autoTable, A4 portrait
 * ============================================================ */

export function buildPdf(kind: ReportKind, data: ExportData): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  registerRoboto(doc)

  pdfHeader(doc, kind, data)

  if (kind === 'cash_book') {
    pdfCashBookBody(doc, data)
  } else if (kind === 'receipt_journal') {
    pdfJournalBody(doc, data, 'in')
  } else {
    pdfJournalBody(doc, data, 'out')
  }

  return doc.output('arraybuffer')
}

function pdfHeader(doc: jsPDF, kind: ReportKind, data: ExportData): void {
  // Top-left: farm info
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text(`Đơn vị: ${data.farm.name}`, 14, 14)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(75, 85, 99)
  if (data.farm.address) doc.text(`Địa chỉ: ${data.farm.address}`, 14, 19)
  if (data.farm.tax_code) doc.text(`MST: ${data.farm.tax_code}`, 14, 24)

  // Title
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 64, 175)
  doc.text(REPORT_TITLES[kind], 105, 35, { align: 'center' })

  // Account label
  const accLabel = data.account
    ? `Tài khoản: ${data.account.name}${data.account.account_number ? ' — ' + data.account.account_number : ''}`
    : 'Tài khoản: Tất cả các quỹ'
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  doc.text(accLabel, 105, 41, { align: 'center' })

  // Period
  doc.text(`Từ ngày ${formatDate(data.fromDate)} đến ngày ${formatDate(data.toDate)}`, 105, 46, {
    align: 'center',
  })
}

function pdfCashBookBody(doc: jsPDF, data: ExportData): void {
  const sorted = [...data.txs].sort((a, b) =>
    a.transaction_date < b.transaction_date
      ? -1
      : a.transaction_date > b.transaction_date
        ? 1
        : a.created_at < b.created_at
          ? -1
          : 1
  )

  let running = data.openingBalance
  let totalIn = 0
  let totalOut = 0
  let inIdx = 0
  let outIdx = 0

  const body: Array<Array<string | number>> = []

  // Số dư đầu kỳ
  body.push([
    { content: 'Số dư đầu kỳ', colSpan: 5, styles: { fontStyle: 'italic', halign: 'left' } } as never,
    '',
    '',
    formatVnd(data.openingBalance),
  ])

  sorted.forEach((t, i) => {
    if (t.direction === 'in') {
      inIdx++
      totalIn += t.amount
      running += t.amount
    } else {
      outIdx++
      totalOut += t.amount
      running -= t.amount
    }
    const counter = data.account
      ? categoryLabel(t.category)
      : `${t.account_name ?? '—'} / ${categoryLabel(t.category)}`
    body.push([
      i + 1,
      formatDate(t.transaction_date),
      ctNumber(t.direction, t.direction === 'in' ? inIdx : outIdx),
      t.description || categoryLabel(t.category),
      counter,
      t.direction === 'in' ? formatVnd(t.amount) : '',
      t.direction === 'out' ? formatVnd(t.amount) : '',
      formatVnd(running),
    ])
  })

  // Cộng phát sinh
  body.push([
    { content: 'Cộng phát sinh', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } } as never,
    '',
    '',
    '',
    '',
    formatVnd(totalIn),
    formatVnd(totalOut),
    '',
  ])
  // Số dư cuối kỳ
  body.push([
    { content: 'Số dư cuối kỳ', colSpan: 5, styles: { fontStyle: 'italic', halign: 'left' } } as never,
    '',
    '',
    formatVnd(data.closingBalance),
  ])

  autoTable(doc, {
    startY: 52,
    head: [['STT', 'Ngày', 'Số CT', 'Diễn giải', 'TK đối ứng', 'Thu', 'Chi', 'Tồn']],
    body,
    theme: 'grid',
    styles: { font: 'Roboto', fontSize: 7.5, cellPadding: 1.4, lineColor: [203, 213, 225] },
    headStyles: {
      font: 'Roboto',
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: { font: 'Roboto' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 17 },
      2: { halign: 'center', cellWidth: 14 },
      3: { cellWidth: 50 },
      4: { cellWidth: 32, fontSize: 7 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      const isOpening = hookData.row.index === 0 && body[0][0] && (body[0][0] as { content?: string }).content === 'Số dư đầu kỳ'
      const isSum =
        hookData.row.index === body.length - 2 &&
        (body[body.length - 2][0] as { content?: string }).content === 'Cộng phát sinh'
      const isClosing =
        hookData.row.index === body.length - 1 &&
        (body[body.length - 1][0] as { content?: string }).content === 'Số dư cuối kỳ'
      if (isOpening || isClosing) {
        hookData.cell.styles.fillColor = [254, 243, 199]
      } else if (isSum) {
        hookData.cell.styles.fillColor = [219, 234, 254]
      }
    },
    margin: { left: 14, right: 14 },
  })

  appendPdfSignature(doc)
}

function pdfJournalBody(doc: jsPDF, data: ExportData, direction: Direction): void {
  const filtered = data.txs
    .filter((t) => t.direction === direction)
    .sort((a, b) =>
      a.transaction_date < b.transaction_date
        ? -1
        : a.transaction_date > b.transaction_date
          ? 1
          : a.created_at < b.created_at
            ? -1
            : 1
    )
  let total = 0
  const body = filtered.map((t, i) => {
    total += t.amount
    return [
      i + 1,
      formatDate(t.transaction_date),
      ctNumber(direction, i + 1),
      extractParty(t.description, direction),
      t.description || categoryLabel(t.category),
      formatVnd(t.amount),
      t.account_name ?? '—',
      categoryLabel(t.category),
    ]
  })
  body.push([
    {
      content: `Tổng cộng (${filtered.length} bút toán)`,
      colSpan: 5,
      styles: { fontStyle: 'bold', halign: 'right' },
    } as never,
    '',
    '',
    '',
    '',
    formatVnd(total),
    '',
    '',
  ])

  const headColor: [number, number, number] = direction === 'in' ? [5, 150, 105] : [220, 38, 38]
  const sumColor: [number, number, number] = direction === 'in' ? [209, 250, 229] : [254, 226, 226]

  autoTable(doc, {
    startY: 52,
    head: [
      [
        'STT',
        'Ngày',
        'Số CT',
        direction === 'in' ? 'Người/đv nộp' : 'Người/đv nhận',
        'Diễn giải',
        'Số tiền',
        'TK quỹ',
        'Phân loại',
      ],
    ],
    body,
    theme: 'grid',
    styles: { font: 'Roboto', fontSize: 7.5, cellPadding: 1.4, lineColor: [203, 213, 225] },
    headStyles: {
      font: 'Roboto',
      fillColor: headColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: { font: 'Roboto' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 17 },
      2: { halign: 'center', cellWidth: 14 },
      3: { cellWidth: 30 },
      4: { cellWidth: 50 },
      5: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      6: { cellWidth: 22, fontSize: 7 },
      7: { cellWidth: 22, fontSize: 7 },
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === body.length - 1) {
        hookData.cell.styles.fillColor = sumColor
      }
    },
    margin: { left: 14, right: 14 },
  })

  appendPdfSignature(doc)
}

function appendPdfSignature(doc: jsPDF): void {
  const page = doc.internal.pageSize
  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  // Nếu sát đáy, thêm trang mới
  let y = lastY + 8
  if (y > page.height - 40) {
    doc.addPage()
    y = 20
  }

  doc.setFont('Roboto', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  const today = new Date()
  doc.text(
    `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`,
    page.width - 14,
    y,
    { align: 'right' }
  )
  y += 8

  // 3 cột chữ ký
  const colW = (page.width - 28) / 3
  const labels = ['Người lập biểu', 'Kế toán trưởng', 'Giám đốc']
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  labels.forEach((l, i) => {
    const x = 14 + colW * i + colW / 2
    doc.text(l, x, y, { align: 'center' })
  })
  doc.setFont('Roboto', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  labels.forEach((_, i) => {
    const x = 14 + colW * i + colW / 2
    doc.text('(Ký, họ tên)', x, y + 5, { align: 'center' })
  })
}
