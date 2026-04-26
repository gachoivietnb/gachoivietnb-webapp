import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const { data: breeds } = await supabase.from('breeds').select('id, code')
  const breedMap = new Map((breeds ?? []).map((b) => {
    const row = b as { id: string; code: string }
    return [row.code, row.id]
  }))

  const errors: Array<{ row: number; error: string }> = []
  const valid: Array<Record<string, unknown>> = []

  rows.forEach((row, idx) => {
    const breedCode = String(row['Giống'] ?? row['breed'] ?? '').toUpperCase()
    const breedId = breedMap.get(breedCode)
    if (!breedId) {
      errors.push({ row: idx + 2, error: `Không tìm thấy giống "${breedCode}"` })
      return
    }

    const weight = parseFloat(String(row['Cân nặng'] ?? row['weight_kg'] ?? ''))
    const cost = parseFloat(String(row['Giá mua'] ?? row['cost_purchase'] ?? ''))

    valid.push({
      breed_id: breedId,
      name: (row['Tên'] ?? row['name']) || null,
      gender: row['Giới tính'] ?? row['gender'] ?? 'chua_xac_dinh',
      birth_date: row['Ngày sinh'] ?? row['birth_date'] ?? null,
      source: row['Nguồn'] === 'Mua' ? 'mua' : 'no_tai_trai',
      weight_kg: Number.isFinite(weight) ? weight : null,
      color: (row['Màu'] ?? row['color']) || null,
      cost_purchase: Number.isFinite(cost) ? cost : null,
      notes: (row['Ghi chú'] ?? row['notes']) || null,
      created_by: user.id,
    })
  })

  if (errors.length > 0) {
    return NextResponse.json({ errors, validCount: valid.length }, { status: 400 })
  }

  const { data, error } = await supabase.from('chickens').insert(valid as never).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data?.length ?? 0, data })
}
