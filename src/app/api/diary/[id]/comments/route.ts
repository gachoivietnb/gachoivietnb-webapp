import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'

const CommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const supabase = await createClient()
  const { data } = await supabase
    .from('diary_comments')
    .select('id, entry_id, author_id, content, created_at, updated_at, author:profiles!author_id(full_name)')
    .eq('entry_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  type Row = {
    id: string
    entry_id: string
    author_id: string | null
    content: string
    created_at: string
    updated_at: string
    author: { full_name: string } | null
  }
  const rows = (data as Row[] | null) ?? []
  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      author_name: r.author?.full_name ?? null,
    })),
  })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = CommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('diary_comments')
    .insert({
      entry_id: id,
      author_id: farm.user.id,
      content: parsed.data.content.trim(),
    } as never)
    .select('*, author:profiles!author_id(full_name)')
    .single()
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'unknown' }, { status: 500 })
  }
  type Row = {
    id: string
    entry_id: string
    author_id: string | null
    content: string
    created_at: string
    updated_at: string
    author: { full_name: string } | null
  }
  const row = data as unknown as Row
  return NextResponse.json({
    data: { ...row, author_name: row.author?.full_name ?? null },
  })
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const commentId = url.searchParams.get('comment_id')
  if (!commentId) {
    return NextResponse.json({ error: 'Missing comment_id' }, { status: 400 })
  }

  const supabase = await createClient()
  // Verify quyền: chủ trại hoặc tác giả comment mới được xoá
  const { data: cm } = await supabase
    .from('diary_comments')
    .select('author_id')
    .eq('id', commentId)
    .maybeSingle<{ author_id: string | null }>()
  if (!cm) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = farm.profile.role === 'chu_trai'
  const isAuthor = cm.author_id === farm.user.id
  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: 'Không có quyền xoá' }, { status: 403 })
  }

  const { error } = await supabase.from('diary_comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // params id còn được dùng để verify entry_id consistency nếu cần — tạm bỏ qua
  void ctx.params
  return NextResponse.json({ ok: true })
}
