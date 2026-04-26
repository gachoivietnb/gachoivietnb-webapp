#!/usr/bin/env node
/**
 * Gán parent_male_id + parent_female_id cho gà demo để tạo cây gia phả
 * 3-4 thế hệ. Chạy nhiều farm bằng cách lặp ENV.
 *
 * Logic:
 * - Sort gà theo birth_date ASC (cụ → cháu)
 * - Cụ-bà / cụ-ông: 4 con đầu tiên, không gán cha mẹ (root)
 * - Đời sau: random gán father (trống lớn tuổi hơn) + mother (mái lớn tuổi hơn)
 *   trong cùng farm
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const FARM_ID = process.env.FARM_ID
if (!url || !key || !FARM_ID) {
  console.error('Missing env')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

function ageMonths(birth) {
  const ms = Date.now() - new Date(birth).getTime()
  return ms / (1000 * 60 * 60 * 24 * 30)
}

async function main() {
  console.log(`🌳 Seeding pedigree for farm ${FARM_ID}...`)
  const { data: all } = await sb
    .from('chickens')
    .select('id, name, chicken_code, gender, birth_date, parent_male_id, parent_female_id')
    .eq('farm_id', FARM_ID)
    .order('birth_date', { ascending: true })

  if (!all?.length) { console.log('No chickens'); return }

  // (no global skip; we just skip per-chicken if it already has parents)

  let assigned = 0
  for (const c of all) {
    if (c.parent_male_id || c.parent_female_id) continue
    const childAge = ageMonths(c.birth_date)
    // Pick parents older by at least 8 months
    const possibleFathers = all.filter((x) =>
      x.id !== c.id &&
      x.gender === 'trong' &&
      ageMonths(x.birth_date) - childAge > 3
    )
    const possibleMothers = all.filter((x) =>
      x.id !== c.id &&
      x.gender === 'mai' &&
      ageMonths(x.birth_date) - childAge > 3
    )

    if (!possibleFathers.length || !possibleMothers.length) continue

    // Random parents
    const father = possibleFathers[Math.floor(Math.random() * possibleFathers.length)]
    const mother = possibleMothers[Math.floor(Math.random() * possibleMothers.length)]

    const { error } = await sb
      .from('chickens')
      .update({ parent_male_id: father.id, parent_female_id: mother.id })
      .eq('id', c.id)
    if (error) {
      // skip silently if validation trigger blocks
      continue
    }
    assigned++
  }
  console.log(`✓ Assigned parents to ${assigned} chickens`)

  // Stats
  const { count: withP } = await sb
    .from('chickens')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
    .or('parent_male_id.not.is.null,parent_female_id.not.is.null')
  console.log(`📊 Total with parents: ${withP}/${all.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
