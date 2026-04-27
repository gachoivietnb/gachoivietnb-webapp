import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type PedigreeRow = {
  generation: number
  tree_position: string
  chicken_id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  gender: string
  birth_date: string | null
  main_photo_url: string | null
  status: string
  qr_tag_number: string | null
}

type PedigreeNode = Omit<PedigreeRow, 'tree_position'> & {
  position: string
  father: PedigreeNode | null
  mother: PedigreeNode | null
}

function buildTree(rows: PedigreeRow[]): PedigreeNode | null {
  const map = new Map<string, PedigreeRow>(rows.map((r) => [r.tree_position, r]))

  function build(position: string): PedigreeNode | null {
    const node = map.get(position)
    if (!node) return null
    const fatherPos = position === 'self' ? 'father' : position + 'f'
    const motherPos = position === 'self' ? 'mother' : position + 'm'
    const { tree_position, ...rest } = node
    return {
      ...rest,
      position: tree_position,
      father: build(fatherPos),
      mother: build(motherPos),
    }
  }

  return build('self')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const depth = Math.min(Math.max(parseInt(searchParams.get('depth') ?? '3'), 1), 10)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_pedigree' as never, {
    p_chicken_id: id,
    p_depth: depth,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flat = (data ?? []) as unknown as PedigreeRow[]
  const tree = buildTree(flat)
  return NextResponse.json({ data: tree, flat })
}
