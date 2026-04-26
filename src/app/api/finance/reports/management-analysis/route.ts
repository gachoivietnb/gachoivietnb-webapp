import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { aggregateForPeriod, getPeriodPair } from '@/lib/reports/aggregate'
import { generateAnalysis } from '@/lib/reports/ai-analysis'

type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year'
const VALID_PRESETS: Preset[] = ['this_month', 'last_month', 'this_quarter', 'this_year']

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const preset = (body.preset as Preset) ?? 'this_month'
  if (!VALID_PRESETS.includes(preset)) {
    return NextResponse.json({ error: 'preset không hợp lệ' }, { status: 400 })
  }

  const range = getPeriodPair(preset)
  const [current, previous] = await Promise.all([
    aggregateForPeriod(range.current.from, range.current.to),
    aggregateForPeriod(range.previous.from, range.previous.to),
  ])

  try {
    const analysis = await generateAnalysis(
      current,
      previous,
      range.current.label,
      range.previous.label
    )
    return NextResponse.json({
      data: {
        preset,
        current_period: range.current,
        previous_period: range.previous,
        current_data: current,
        previous_data: previous,
        analysis,
      },
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Lỗi gọi AI',
        // Trả về data để client vẫn hiển thị được phần KPI mặc dù AI fail
        data: {
          preset,
          current_period: range.current,
          previous_period: range.previous,
          current_data: current,
          previous_data: previous,
          analysis: null,
        },
      },
      { status: 200 }
    )
  }
}

export async function GET(request: Request) {
  // Variant không gọi AI — chỉ return aggregate để load nhanh khi mở trang
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const preset = (url.searchParams.get('preset') as Preset) ?? 'this_month'
  if (!VALID_PRESETS.includes(preset)) {
    return NextResponse.json({ error: 'preset không hợp lệ' }, { status: 400 })
  }
  const range = getPeriodPair(preset)
  const [current, previous] = await Promise.all([
    aggregateForPeriod(range.current.from, range.current.to),
    aggregateForPeriod(range.previous.from, range.previous.to),
  ])
  return NextResponse.json({
    data: {
      preset,
      current_period: range.current,
      previous_period: range.previous,
      current_data: current,
      previous_data: previous,
    },
  })
}
