import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const CONTENT_DIR = path.join(process.cwd(), 'bi kip su ke')

async function findFileForSlug(slug: string): Promise<string | null> {
  const files = await fs.readdir(CONTENT_DIR)
  for (const f of files) {
    if (!f.endsWith('.md')) continue
    const full = path.join(CONTENT_DIR, f)
    const raw = await fs.readFile(full, 'utf-8')
    const m = raw.match(/\*\*Slug gợi ý:\*\*\s*\/?([^\s\n]+)/)
    const fileSlug = (m?.[1] ?? f.replace(/^bai-\d+-/, '').replace(/\.md$/, ''))
      .replace(/^\/+/, '')
      .toLowerCase()
    if (fileSlug === slug.toLowerCase()) return full
  }
  return null
}

async function ensureChuTrai(): Promise<{ ok: true } | { ok: false; res: Response }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return {
      ok: false,
      res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (profile?.role !== 'chu_trai')
    return {
      ok: false,
      res: NextResponse.json({ error: 'Chỉ chủ trại được sửa Bí Kíp' }, { status: 403 }),
    }
  return { ok: true }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await ensureChuTrai()
  if (!auth.ok) return auth.res
  const { slug } = await params
  const file = await findFileForSlug(slug)
  if (!file) return NextResponse.json({ error: 'Không tìm thấy bài' }, { status: 404 })
  const raw = await fs.readFile(file, 'utf-8')
  const stat = await fs.stat(file)
  return NextResponse.json({
    data: {
      slug,
      filename: path.basename(file),
      raw,
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
    },
  })
}

const PatchSchema = z.object({
  raw: z.string().min(20).max(200_000),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await ensureChuTrai()
  if (!auth.ok) return auth.res

  const { slug } = await params
  const file = await findFileForSlug(slug)
  if (!file) return NextResponse.json({ error: 'Không tìm thấy bài' }, { status: 404 })

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  // Sanity: must still contain the slug marker so users don't accidentally orphan the route
  const slugPattern = new RegExp(`\\*\\*Slug gợi ý:\\*\\*\\s*\\/?${slug}`, 'i')
  if (!slugPattern.test(parsed.data.raw)) {
    return NextResponse.json(
      {
        error: `Nội dung phải giữ dòng "**Slug gợi ý:** /${slug}" để khớp URL hiện tại. Đổi slug sẽ phá link.`,
      },
      { status: 400 }
    )
  }

  try {
    await fs.writeFile(file, parsed.data.raw, 'utf-8')
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Không ghi được file. Trên Vercel filesystem là read-only — lúc deploy production cần chuyển sang DB. Local dev OK. ' +
          (e instanceof Error ? e.message : ''),
      },
      { status: 500 }
    )
  }

  const stat = await fs.stat(file)
  return NextResponse.json({
    data: {
      slug,
      filename: path.basename(file),
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
    },
  })
}
