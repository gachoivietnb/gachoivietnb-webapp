import sharp from 'sharp'

export type WatermarkConfig = {
  brand: string
  url: string
  phone?: string
}

export async function getWatermarkConfig(
  fetcher: () => Promise<Record<string, string> | null>
): Promise<WatermarkConfig> {
  const farm = (await fetcher()) ?? {}
  return {
    brand: farm.name ?? 'Gà Chọi Việt Ninh Bình',
    url: farm.website ?? 'https://gachoivietnb.com',
    phone: farm.phone ?? '',
  }
}

// Tạo watermark SVG (để composite với ảnh) — có bóng, kích thước co giãn theo width
function buildWatermarkSvg(config: WatermarkConfig, imgWidth: number, imgHeight: number): Buffer {
  const fontSize = Math.max(14, Math.min(Math.round(imgWidth / 40), 32))
  const smallFont = Math.round(fontSize * 0.68)
  const padding = Math.round(fontSize * 0.6)

  // Số line ở góc: brand + url + phone (nếu có)
  const lines: string[] = [config.brand, config.url]
  if (config.phone) lines.push(`☎ ${config.phone}`)

  const x = imgWidth - padding
  const lineHeight = smallFont + Math.round(smallFont * 0.3)
  const totalHeight = fontSize + (lines.length - 1) * lineHeight
  const startY = imgHeight - padding - totalHeight + fontSize

  // Watermark diagonal mờ ở giữa
  const centerFont = Math.max(16, Math.round(imgWidth / 20))
  const cx = imgWidth / 2
  const cy = imgHeight / 2

  const cornerTexts: string[] = []
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight
    const fs = i === 0 ? fontSize : smallFont
    const weight = i === 0 ? 700 : 500
    cornerTexts.push(
      `<text x="${x + 1}" y="${y + 1}" text-anchor="end" font-family="Arial,sans-serif" font-weight="${weight}" font-size="${fs}" fill="rgba(0,0,0,0.65)">${escapeXml(line)}</text>`,
      `<text x="${x}" y="${y}" text-anchor="end" font-family="Arial,sans-serif" font-weight="${weight}" font-size="${fs}" fill="white">${escapeXml(line)}</text>`
    )
  })

  const svg = `
<svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="${cy}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700"
        font-size="${centerFont}" fill="rgba(255,255,255,0.18)"
        transform="rotate(-28 ${cx} ${cy})">
    ${escapeXml(config.brand)}${config.phone ? ' · ' + escapeXml(config.phone) : ''}
  </text>
  ${cornerTexts.join('\n')}
</svg>`.trim()

  return Buffer.from(svg)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function applyWatermark(
  input: Buffer,
  config: WatermarkConfig
): Promise<Buffer> {
  try {
    const image = sharp(input, { failOn: 'none' })
    const meta = await image.metadata()
    const width = meta.width ?? 1200
    const height = meta.height ?? 1200

    // Resize nếu quá lớn để giảm dung lượng + giữ chất lượng
    const maxDim = 2400
    let resized = image
    if (width > maxDim || height > maxDim) {
      resized = image.resize({ width: Math.min(width, maxDim), height: Math.min(height, maxDim), fit: 'inside', withoutEnlargement: true })
    }
    const rotated = resized.rotate() // auto-orient theo EXIF

    const processed = await rotated.toBuffer({ resolveWithObject: true })
    const finalWidth = processed.info.width
    const finalHeight = processed.info.height

    const svg = buildWatermarkSvg(config, finalWidth, finalHeight)

    const result = await sharp(processed.data)
      .composite([{ input: svg, blend: 'over' }])
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    return result
  } catch (err) {
    console.error('Watermark failed, returning original:', err)
    return input
  }
}
