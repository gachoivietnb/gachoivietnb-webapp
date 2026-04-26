import type { BiKipImage } from './loader'

export type Heading = { id: string; level: 2 | 3; text: string }

/**
 * Tiny safe markdown → React renderer for the Bí Kíp Sư Kê content style.
 * Supports: H1/H2/H3 (with auto IDs for TOC), paragraphs, **bold**, *italic*,
 * [link](url), unordered/ordered lists, > blockquote, tables, --- HR.
 *
 * Returns both the rendered nodes and the H2/H3 outline (for the sidebar TOC).
 * Also distributes images (after the hero) by inserting them after H2 sections.
 */
export function renderMarkdown(
  raw: string,
  images: BiKipImage[]
): { nodes: React.ReactNode[]; headings: Heading[] } {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const nodes: React.ReactNode[] = []
  const headings: Heading[] = []

  // Extra images (after hero) to inject between sections
  const extraImages = images.slice(1)
  let extraImgIdx = 0
  let h2Counter = 0

  let i = 0
  let key = 0

  function nextKey(): string {
    return 'k' + (++key)
  }

  while (i < lines.length) {
    const line = lines[i]

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      nodes.push(
        <hr key={nextKey()} className="my-8 border-t border-gray-200 dark:border-gray-700" />
      )
      i++
      continue
    }

    // Headings
    const h1 = line.match(/^#\s+(.+)$/)
    if (h1) {
      // First H1 = article title (rendered separately as hero), skip
      i++
      continue
    }
    const h2 = line.match(/^##\s+(.+)$/)
    if (h2) {
      const text = h2[1].trim()
      // Skip "## Hết Bài" or "## TỪ KHOÁ" — those handled outside
      if (/(TỪ KHO[ÁA]|HÌNH ẢNH|Gợi Ý.*Giới Thiệu)/i.test(text)) {
        // Stop rendering at these structural sections
        break
      }
      const id = slugifyHeading(text)
      headings.push({ id, level: 2, text })
      // Inject extra image *before* every other H2 (after the first one)
      h2Counter++
      if (h2Counter > 1 && extraImgIdx < extraImages.length) {
        nodes.push(
          <ArticleImage key={nextKey()} img={extraImages[extraImgIdx]!} />
        )
        extraImgIdx++
      }
      nodes.push(
        <h2
          key={nextKey()}
          id={id}
          className="scroll-mt-24 text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-10 mb-4 leading-tight tracking-tight"
        >
          {renderInline(text)}
        </h2>
      )
      i++
      continue
    }
    const h3 = line.match(/^###\s+(.+)$/)
    if (h3) {
      const text = h3[1].trim()
      const id = slugifyHeading(text)
      headings.push({ id, level: 3, text })
      nodes.push(
        <h3
          key={nextKey()}
          id={id}
          className="scroll-mt-24 text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mt-7 mb-3"
        >
          {renderInline(text)}
        </h3>
      )
      i++
      continue
    }

    // Tables (multi-line block)
    if (line.startsWith('|') && lines[i + 1]?.startsWith('|') && /[-: ]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [line]
      let j = i + 1
      while (j < lines.length && lines[j].startsWith('|')) {
        tableLines.push(lines[j])
        j++
      }
      nodes.push(<TableBlock key={nextKey()} lines={tableLines} />)
      i = j
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const block: string[] = []
      let j = i
      while (j < lines.length && lines[j].startsWith('>')) {
        block.push(lines[j].replace(/^>\s?/, ''))
        j++
      }
      nodes.push(
        <blockquote
          key={nextKey()}
          className="my-5 border-l-4 border-orange-400 dark:border-orange-700 bg-orange-50/60 dark:bg-orange-950/20 px-4 py-3 rounded-r-lg text-gray-800 dark:text-gray-200 italic"
        >
          {renderInline(block.join(' '))}
        </blockquote>
      )
      i = j
      continue
    }

    // Unordered list
    if (/^-\s+/.test(line) || /^\*\s+/.test(line)) {
      const items: string[] = []
      let j = i
      while (j < lines.length && /^(-|\*)\s+/.test(lines[j])) {
        items.push(lines[j].replace(/^(-|\*)\s+/, ''))
        j++
      }
      nodes.push(
        <ul
          key={nextKey()}
          className="my-4 space-y-1.5 text-gray-700 dark:text-gray-300 list-disc list-outside ml-5"
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      )
      i = j
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      let j = i
      while (j < lines.length && /^\d+\.\s+/.test(lines[j])) {
        items.push(lines[j].replace(/^\d+\.\s+/, ''))
        j++
      }
      nodes.push(
        <ol
          key={nextKey()}
          className="my-4 space-y-1.5 text-gray-700 dark:text-gray-300 list-decimal list-outside ml-5"
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      )
      i = j
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph (consume contiguous non-blank, non-special lines)
    const para: string[] = [line]
    let j = i + 1
    while (
      j < lines.length &&
      lines[j].trim() !== '' &&
      !/^#{1,3}\s/.test(lines[j]) &&
      !/^---+\s*$/.test(lines[j]) &&
      !lines[j].startsWith('|') &&
      !lines[j].startsWith('>') &&
      !/^(-|\*)\s+/.test(lines[j]) &&
      !/^\d+\.\s+/.test(lines[j])
    ) {
      para.push(lines[j])
      j++
    }
    nodes.push(
      <p
        key={nextKey()}
        className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] md:text-base"
      >
        {renderInline(para.join(' '))}
      </p>
    )
    i = j
  }

  // Append remaining images at end if any (gallery)
  if (extraImgIdx < extraImages.length) {
    const remaining = extraImages.slice(extraImgIdx)
    nodes.push(
      <section key={nextKey()} className="mt-10">
        <h2
          id="hinh-anh-minh-hoa"
          className="scroll-mt-24 text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4"
        >
          🖼 Hình ảnh minh hoạ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {remaining.map((img, idx) => (
            <figure
              key={idx}
              className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt}
                loading="lazy"
                className="w-full aspect-video object-cover"
              />
              <figcaption className="text-xs text-gray-600 dark:text-gray-400 px-3 py-2">
                {img.description}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    )
  }

  return { nodes, headings }
}

function ArticleImage({ img }: { img: BiKipImage }) {
  return (
    <figure className="my-7 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={img.alt}
        loading="lazy"
        className="w-full aspect-video object-cover"
      />
      <figcaption className="text-[13px] text-gray-600 dark:text-gray-400 px-4 py-2 italic border-t border-gray-100 dark:border-gray-700">
        {img.description}
      </figcaption>
    </figure>
  )
}

function TableBlock({ lines }: { lines: string[] }) {
  // First row = header, second = separator, rest = body
  const header = lines[0].split('|').slice(1, -1).map((c) => c.trim())
  const bodyLines = lines.slice(2)
  const rows = bodyLines.map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))

  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 text-gray-900 dark:text-gray-100">
          <tr>
            {header.map((c, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold border-b border-gray-200 dark:border-gray-700"
              >
                {renderInline(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  // Handle in priority: links, then bold (**), then italic (*), then code (`), then plain
  // Use placeholder approach: tokenize
  const nodes: React.ReactNode[] = []
  let key = 0
  let s = text

  // Process iteratively: find first match of any pattern, push leading text, push node, continue
  while (s.length > 0) {
    // Link
    const link = s.match(/\[([^\]]+)\]\(([^)]+)\)/)
    // Bold
    const bold = s.match(/\*\*([^*]+)\*\*/)
    // Italic (single * not part of **)
    const italic = s.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
    // Code
    const code = s.match(/`([^`]+)`/)

    const candidates = [
      link ? { match: link, type: 'link' as const, idx: link.index ?? -1 } : null,
      bold ? { match: bold, type: 'bold' as const, idx: bold.index ?? -1 } : null,
      italic ? { match: italic, type: 'italic' as const, idx: italic.index ?? -1 } : null,
      code ? { match: code, type: 'code' as const, idx: code.index ?? -1 } : null,
    ].filter((x): x is NonNullable<typeof x> => x !== null && x.idx >= 0)

    if (candidates.length === 0) {
      nodes.push(s)
      break
    }

    candidates.sort((a, b) => a.idx - b.idx)
    const first = candidates[0]
    const before = s.slice(0, first.idx)
    if (before) nodes.push(before)

    if (first.type === 'link') {
      nodes.push(
        <a
          key={++key}
          href={first.match[2]}
          target={first.match[2].startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="text-orange-700 dark:text-orange-400 underline decoration-orange-300 hover:decoration-orange-500 transition"
        >
          {first.match[1]}
        </a>
      )
    } else if (first.type === 'bold') {
      nodes.push(
        <strong key={++key} className="font-bold text-gray-900 dark:text-gray-100">
          {first.match[1]}
        </strong>
      )
    } else if (first.type === 'italic') {
      nodes.push(
        <em key={++key} className="italic">
          {first.match[1]}
        </em>
      )
    } else if (first.type === 'code') {
      nodes.push(
        <code
          key={++key}
          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-orange-700 dark:text-orange-300 text-[13px] font-mono"
        >
          {first.match[1]}
        </code>
      )
    }
    s = s.slice(first.idx + first.match[0].length)
  }

  return nodes
}

function slugifyHeading(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
