'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type PedigreeNode = {
  generation: number
  position: string
  chicken_id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  gender: string
  birth_date: string | null
  main_photo_url: string | null
  status: string
  qr_tag_number: string | null
  father: PedigreeNode | null
  mother: PedigreeNode | null
}

const POSITION_LABELS: Record<string, string> = {
  self: 'Bản thân',
  father: 'Bố',
  mother: 'Mẹ',
  ff: 'Ông nội',
  fm: 'Bà nội',
  mf: 'Ông ngoại',
  mm: 'Bà ngoại',
}

export function PedigreeTree({ chickenId, initialDepth = 3 }: { chickenId: string; initialDepth?: number }) {
  const [depth, setDepth] = useState(initialDepth)
  const [tree, setTree] = useState<PedigreeNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/chickens/${chickenId}/pedigree?depth=${depth}`)
      .then((r) => r.json())
      .then((json) => {
        setTree(json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [chickenId, depth])

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Đang tải gia phả...</div>
  if (!tree) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Không có dữ liệu gia phả</div>

  const totalLevels = depth + 1
  const totalCols = Math.pow(2, depth)

  const cells: React.ReactNode[] = []
  renderRecursive(tree, 0, totalLevels, 0, totalCols, cells)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-600 dark:text-gray-400">Số đời tổ tiên:</span>
        {[2, 3, 4, 5].map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            className={`px-3 py-1 text-sm rounded ${
              depth === d
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {d} đời
          </button>
        ))}
      </div>

      {/* Mobile (vertical recursive tree) */}
      <div className="md:hidden">
        <PedigreeVertical node={tree} depth={depth} />
      </div>

      {/* Desktop (horizontal grid) */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div
          className="grid gap-2 min-w-max"
          style={{
            gridTemplateColumns: `repeat(${totalCols}, minmax(150px, 1fr))`,
            gridTemplateRows: `repeat(${totalLevels}, auto)`,
          }}
        >
          {cells}
        </div>
      </div>
    </div>
  )
}

/**
 * Vertical tree for mobile — recursive nested layout.
 * Shows Bố lineage trên, Mẹ lineage dưới; thụt lề theo level.
 */
function PedigreeVertical({ node, depth }: { node: PedigreeNode | null; depth: number }) {
  if (!node) return null
  return (
    <div className="space-y-3">
      <PedigreeCard node={node} />
      {depth > 0 && (node.father || node.mother) && (
        <div className="space-y-3">
          {node.father && <Branch node={node.father} side="father" depth={depth - 1} />}
          {node.mother && <Branch node={node.mother} side="mother" depth={depth - 1} />}
        </div>
      )}
    </div>
  )
}

function Branch({
  node,
  side,
  depth,
}: {
  node: PedigreeNode
  side: 'father' | 'mother'
  depth: number
}) {
  const accent =
    side === 'father'
      ? 'border-l-blue-300 dark:border-l-blue-700'
      : 'border-l-pink-300 dark:border-l-pink-700'
  return (
    <div className={`pl-3 border-l-4 ${accent} space-y-2`}>
      <PedigreeCard node={node} />
      {depth > 0 && (node.father || node.mother) && (
        <div className="space-y-2">
          {node.father && <Branch node={node.father} side="father" depth={depth - 1} />}
          {node.mother && <Branch node={node.mother} side="mother" depth={depth - 1} />}
        </div>
      )}
    </div>
  )
}

function renderRecursive(
  node: PedigreeNode | null,
  level: number,
  totalLevels: number,
  startCol: number,
  spanCol: number,
  out: React.ReactNode[]
) {
  if (!node || level >= totalLevels) return
  const gridRow = totalLevels - level
  out.push(
    <div
      key={`${node.position}-${level}`}
      style={{ gridRow, gridColumn: `${startCol + 1} / span ${spanCol}` }}
    >
      <PedigreeCard node={node} />
    </div>
  )
  if (level + 1 < totalLevels) {
    const halfSpan = spanCol / 2
    renderRecursive(node.father, level + 1, totalLevels, startCol, halfSpan, out)
    renderRecursive(node.mother, level + 1, totalLevels, startCol + halfSpan, halfSpan, out)
  }
}

function PedigreeCard({ node }: { node: PedigreeNode }) {
  const isMale = node.gender === 'trong'
  const isFemale = node.gender === 'mai'
  const bg = isMale
    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
    : isFemale
      ? 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-900'
      : 'bg-gray-50 border-gray-200 dark:bg-gray-900/40 dark:border-gray-700'
  const label = POSITION_LABELS[node.position] ?? node.position

  return (
    <Link
      href={`/admin/ho-so-ga/${node.chicken_id}`}
      className={`block border ${bg} rounded-lg p-2 hover:shadow-md transition`}
    >
      {label && node.position !== 'self' && (
        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</div>
      )}
      <div className="flex gap-2 items-start">
        {node.main_photo_url ? (
          <img
            src={node.main_photo_url}
            alt={node.chicken_code}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-white/50 flex items-center justify-center text-lg flex-shrink-0">
            🐓
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {node.name ?? node.chicken_code}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{node.breed_name}</div>
          {node.qr_tag_number && (
            <div className="text-[10px] text-blue-600 dark:text-blue-400">#{node.qr_tag_number}</div>
          )}
        </div>
      </div>
    </Link>
  )
}
