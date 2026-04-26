#!/usr/bin/env node
/**
 * Replace broken Wikipedia URLs in 35 bi-kip articles with verified working URLs.
 * Walks each `.md` file, finds the "## HÌNH ẢNH GỢI Ý" table, swaps the URL
 * column. Description/position/alt are kept (so SEO + caption stay article-specific).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'bi kip su ke')

// 13 verified working image URLs (chicken / farm / rural scenes).
// Each article will receive a deterministic slice of this pool based on its number.
const POOL = [
  // Wikipedia Commons (real chicken photos)
  'https://commons.wikimedia.org/wiki/Special:FilePath/Asil_chicken.jpg?width=1200',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Shamo_chicken.jpg?width=1200',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Chicken_coop.jpg?width=1200',
  // Pexels (chicken / farm)
  'https://images.pexels.com/photos/2255355/pexels-photo-2255355.jpeg?auto=compress&cs=tinysrgb&w=1280',
  'https://images.pexels.com/photos/195226/pexels-photo-195226.jpeg?auto=compress&cs=tinysrgb&w=1280',
  'https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&w=1280',
  'https://images.pexels.com/photos/302280/pexels-photo-302280.jpeg?auto=compress&cs=tinysrgb&w=1280',
  'https://images.pexels.com/photos/1314550/pexels-photo-1314550.jpeg?auto=compress&cs=tinysrgb&w=1280',
  'https://images.pexels.com/photos/1300355/pexels-photo-1300355.jpeg?auto=compress&cs=tinysrgb&w=1280',
  // Unsplash (rooster / poultry)
  'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=1200&q=80',
  'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=1200&q=80',
  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200&q=80',
  'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&q=80',
  'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80',
]

function pick(articleNum, slot) {
  // Deterministic offset by article + slot — distributes pool evenly without obvious
  // repetition between adjacent articles.
  return POOL[(articleNum * 5 + slot) % POOL.length]
}

const HEADER_LINE = '## HÌNH ẢNH GỢI Ý'

let totalFiles = 0
let totalRows = 0

const files = (await readdir(DIR)).filter((f) => f.endsWith('.md')).sort()
for (const fname of files) {
  const numMatch = fname.match(/^bai-(\d+)/)
  if (!numMatch) continue
  const articleNum = parseInt(numMatch[1], 10)
  const fpath = path.join(DIR, fname)
  const raw = await readFile(fpath, 'utf-8')

  const idx = raw.indexOf(HEADER_LINE)
  if (idx < 0) continue

  // Section is everything from the header to the end of the file.
  const head = raw.slice(0, idx)
  const tail = raw.slice(idx)

  const lines = tail.split('\n')
  let slot = 0
  let rowsInThisFile = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('|')) continue
    if (line.includes('---')) continue
    if (/^\|\s*#\s*\|/i.test(line)) continue

    const cells = line.split('|')
    // Format: ['', ' # ', ' description ', ' url ', ' position ', ' alt ', '']
    if (cells.length < 6) continue
    const num = cells[1].trim()
    if (!/^\d+$/.test(num)) continue

    // Replace cells[3] (URL column)
    cells[3] = ' ' + pick(articleNum, slot) + ' '
    lines[i] = cells.join('|')
    slot++
    rowsInThisFile++
  }

  if (rowsInThisFile === 0) continue
  const updated = head + lines.join('\n')
  await writeFile(fpath, updated, 'utf-8')
  totalFiles++
  totalRows += rowsInThisFile
  console.log(`✓ ${fname} — ${rowsInThisFile} URLs swapped`)
}

console.log(`\n🎉 Done: ${totalFiles} files, ${totalRows} image URLs replaced`)
