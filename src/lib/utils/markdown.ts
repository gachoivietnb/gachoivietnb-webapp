/**
 * Minimal safe Markdown → HTML converter.
 * Hỗ trợ: heading (# ## ###), bold, italic, link, list, paragraph, blockquote.
 * Escape HTML để tránh XSS từ nội dung AI/user input.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>')
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, text, url) => {
      const safeUrl = /^https?:\/\//.test(url) ? url : '#'
      return `<a href="${safeUrl}" class="text-blue-600 dark:text-blue-400 underline hover:opacity-80" target="_blank" rel="noopener noreferrer">${text}</a>`
    })
}

export function markdownToHtml(md: string): string {
  if (!md) return ''
  const escaped = escapeHtml(md)
  const lines = escaped.split('\n')
  const out: string[] = []
  let inList = false
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p class="my-3 leading-relaxed">${inlineMd(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      out.push(`<h3 class="text-lg font-semibold mt-6 mb-2">${inlineMd(line.slice(4))}</h3>`)
    } else if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      out.push(`<h2 class="text-2xl font-bold mt-8 mb-3 text-gray-900 dark:text-gray-100">${inlineMd(line.slice(3))}</h2>`)
    } else if (line.startsWith('# ')) {
      flushParagraph()
      flushList()
      out.push(`<h2 class="text-2xl font-bold mt-8 mb-3 text-gray-900 dark:text-gray-100">${inlineMd(line.slice(2))}</h2>`)
    } else if (/^[-*]\s/.test(line)) {
      flushParagraph()
      if (!inList) {
        out.push('<ul class="list-disc list-inside my-3 space-y-1">')
        inList = true
      }
      out.push(`<li>${inlineMd(line.replace(/^[-*]\s/, ''))}</li>`)
    } else if (/^&gt;\s/.test(line)) {
      flushParagraph()
      flushList()
      out.push(
        `<blockquote class="border-l-4 border-blue-400 pl-4 my-3 italic text-gray-700 dark:text-gray-300">${inlineMd(
          line.replace(/^&gt;\s/, '')
        )}</blockquote>`
      )
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()

  return out.join('\n')
}
