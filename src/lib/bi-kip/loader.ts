import 'server-only'
import fs from 'fs/promises'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'bi kip su ke')

export type BiKipImage = {
  description: string
  url: string
  position: string
  alt: string
}

export type BiKipChapter = {
  key: string
  emoji: string
  title: string
  desc: string
  bar: string // tailwind gradient classes
  badge: string // tailwind classes for chip
  range: [number, number] // article numbers (inclusive)
}

export const CHAPTERS: BiKipChapter[] = [
  {
    key: 'khoi-dau',
    emoji: '📖',
    title: 'Khởi đầu & Chọn giống',
    desc: 'Tổng quan, lịch sử, các giống, cách chọn gà tốt',
    bar: 'from-blue-400 to-indigo-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    range: [1, 9],
  },
  {
    key: 'chuong-trai',
    emoji: '🏠',
    title: 'Chuồng trại',
    desc: 'Thiết kế chuồng, ánh sáng, vệ sinh, không gian nhỏ',
    bar: 'from-amber-400 to-orange-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    range: [10, 13],
  },
  {
    key: 'dinh-duong',
    emoji: '🌾',
    title: 'Dinh dưỡng & Thức ăn',
    desc: 'Khẩu phần, phối trộn, thảo dược, nước uống',
    bar: 'from-emerald-400 to-teal-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    range: [14, 19],
  },
  {
    key: 'suc-khoe',
    emoji: '💉',
    title: 'Sức khỏe & Phòng bệnh',
    desc: 'Tiêm phòng, các bệnh thường gặp, hồi phục sau đá',
    bar: 'from-rose-400 to-red-500',
    badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    range: [20, 26],
  },
  {
    key: 'huan-luyen',
    emoji: '🥊',
    title: 'Huấn luyện & Thi đấu',
    desc: 'Vần gà, bài tập thể lực, cắt tỉa, thế đá, sai lầm',
    bar: 'from-violet-400 to-purple-500',
    badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
    range: [27, 31],
  },
  {
    key: 'kinh-doanh',
    emoji: '💰',
    title: 'Kinh doanh & Pháp lý',
    desc: 'Lợi nhuận, định giá, thương hiệu, pháp luật',
    bar: 'from-cyan-400 to-sky-500',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
    range: [32, 35],
  },
]

export type BiKipArticleMeta = {
  number: number
  slug: string
  filename: string
  title: string
  shortTitle: string // without "Bài N/35:" prefix
  primaryKeyword: string
  metaDescription: string
  secondaryKeywords: string[]
  longTailKeywords: string[]
  expectedLength: string // "~2.000 từ"
  chapter: BiKipChapter
  heroImage: BiKipImage | null
  images: BiKipImage[] // all images including hero
  rawBody: string // markdown content (NỘI DUNG section only)
  wordCount: number
  readMinutes: number
}

export type BiKipArticle = BiKipArticleMeta

let _cached: BiKipArticleMeta[] | null = null

export async function loadAllArticles(): Promise<BiKipArticleMeta[]> {
  if (_cached) return _cached
  const files = await fs.readdir(CONTENT_DIR)
  const mdFiles = files.filter((f) => f.endsWith('.md')).sort()
  const articles: BiKipArticleMeta[] = []
  for (const fname of mdFiles) {
    const article = await parseArticleFile(fname)
    if (article) articles.push(article)
  }
  articles.sort((a, b) => a.number - b.number)
  _cached = articles
  return articles
}

export async function getArticleBySlug(slug: string): Promise<BiKipArticleMeta | null> {
  const all = await loadAllArticles()
  return all.find((a) => a.slug === slug) ?? null
}

export function getChapterFor(num: number): BiKipChapter {
  return CHAPTERS.find((c) => num >= c.range[0] && num <= c.range[1]) ?? CHAPTERS[0]
}

async function parseArticleFile(filename: string): Promise<BiKipArticleMeta | null> {
  const numMatch = filename.match(/^bai-(\d+)/)
  if (!numMatch) return null
  const number = parseInt(numMatch[1], 10)
  const filePath = path.join(CONTENT_DIR, filename)
  const raw = await fs.readFile(filePath, 'utf-8')

  // Extract Slug
  const slugMatch = raw.match(/\*\*Slug gợi ý:\*\*\s*\/?([^\s\n]+)/)
  const slugRaw = slugMatch?.[1] ?? filename.replace(/^bai-\d+-/, '').replace(/\.md$/, '')
  const slug = slugRaw.replace(/^\/+/, '').toLowerCase()

  // Extract title (line starting with `## Bài N/35:`)
  const titleMatch = raw.match(/^##\s*Bài\s*\d+\/\d+:\s*(.+)$/m)
  const shortTitle = (titleMatch?.[1] ?? '').trim()

  // Extract primary keyword
  const pkMatch = raw.match(/\*\*Từ khoá chính:\*\*\s*(.+)/)
  const primaryKeyword = (pkMatch?.[1] ?? '').trim()

  // Meta description
  const metaMatch = raw.match(/\*\*Meta description:\*\*\s*(.+)/)
  const metaDescription = (metaMatch?.[1] ?? '').trim()

  // Secondary keywords (in SEO header — comma list)
  const secMatch = raw.match(/\*\*Từ khoá phụ:\*\*\s*(.+)/)
  const secondaryKeywords = (secMatch?.[1] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Expected length
  const lenMatch = raw.match(/\*\*Độ dài bài:\*\*\s*(.+)/)
  const expectedLength = (lenMatch?.[1] ?? '').trim()

  // Long-tail (from end-of-file block)
  const longTailKeywords: string[] = []
  const ltSection = raw.split('**Từ khoá đuôi dài (Long-tail):**')[1]
  if (ltSection) {
    const lines = ltSection.split('\n').slice(0, 15)
    for (const line of lines) {
      const m = line.match(/^-\s*(.+)$/)
      if (m) longTailKeywords.push(m[1].trim())
    }
  }

  // Body: from first H1 (after SEO block) up to "## HÌNH ẢNH GỢI Ý"
  const noiDungIdx = raw.indexOf('## NỘI DUNG BÀI VIẾT')
  let bodyStart = noiDungIdx >= 0 ? noiDungIdx + '## NỘI DUNG BÀI VIẾT'.length : 0
  // Skip leading separators
  bodyStart = raw.indexOf('\n', bodyStart) + 1
  const imgHeaderIdx = raw.indexOf('## HÌNH ẢNH GỢI Ý')
  const bodyEnd = imgHeaderIdx >= 0 ? imgHeaderIdx : raw.length
  let body = raw.slice(bodyStart, bodyEnd).trim()
  // Drop leading horizontal rules
  body = body.replace(/^(---\s*\n)+/g, '').trim()
  // Drop the "Gợi Ý & Giới Thiệu" section (we'll add our own CTA) — find heading and cut
  const cutIdx = body.search(/^##\s*(Gợi Ý.*Giới Thiệu|Gợi ý.*Giới thiệu)/im)
  let bodyTrimmed = cutIdx >= 0 ? body.slice(0, cutIdx).trim() : body

  // Drop trailing "*— Hết Bài N/35 —*" footer if present
  bodyTrimmed = bodyTrimmed.replace(/\*—\s*Hết\s+Bài[^*]*\*[\s\S]*$/i, '').trim()

  // Parse images table
  const images = parseImageTable(raw)

  // Word count + read time (220 wpm Vietnamese)
  const plain = bodyTrimmed.replace(/[#*>`|_\-\[\]\(\)]/g, ' ')
  const wordCount = plain.trim().split(/\s+/).filter(Boolean).length
  const readMinutes = Math.max(1, Math.round(wordCount / 220))

  return {
    number,
    slug,
    filename,
    title: shortTitle,
    shortTitle,
    primaryKeyword,
    metaDescription,
    secondaryKeywords,
    longTailKeywords,
    expectedLength,
    chapter: getChapterFor(number),
    heroImage: images[0] ?? null,
    images,
    rawBody: bodyTrimmed,
    wordCount,
    readMinutes,
  }
}

function parseImageTable(raw: string): BiKipImage[] {
  const idx = raw.indexOf('## HÌNH ẢNH GỢI Ý')
  if (idx < 0) return []
  const section = raw.slice(idx)
  const lines = section.split('\n')
  const images: BiKipImage[] = []
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    // Skip header/separator rows
    if (line.includes('---')) continue
    if (/^\|\s*#\s*\|/i.test(line)) continue // header
    const cells = line.split('|').map((c) => c.trim())
    // First cell is empty (line starts with |)
    // Format: | # | Mô tả | Link | Vị trí | Alt |
    if (cells.length < 6) continue
    const num = cells[1]
    if (!/^\d+$/.test(num)) continue
    const description = cells[2]
    const url = cells[3]
    const position = cells[4]
    const alt = cells[5]
    if (!url || !url.startsWith('http')) continue
    images.push({ description, url, position, alt })
  }
  return images
}
