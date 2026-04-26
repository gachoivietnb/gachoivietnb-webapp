'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Node = {
  chicken_id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  gender: string
  qr_tag_number: string | null
  position: string
  father: Node | null
  mother: Node | null
}

export function PedigreeMiniTree({ chickenId }: { chickenId: string }) {
  const [tree, setTree] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/chickens/${chickenId}/pedigree?depth=3`)
      .then((r) => r.json())
      .then((j) => {
        setTree(j.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [chickenId])

  if (loading) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        <span className="inline-block animate-spin mr-1.5">🌳</span> Đang tải gia phả...
      </div>
    )
  }
  if (!tree) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        Không có dữ liệu gia phả
      </div>
    )
  }

  const hasParents = !!(tree.father || tree.mother)
  if (!hasParents) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/60 p-5 text-center">
        <div className="text-3xl mb-1">🌱</div>
        <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Chưa cập nhật dữ liệu bố mẹ
        </div>
      </div>
    )
  }

  const hasGrand =
    !!(tree.father?.father || tree.father?.mother || tree.mother?.father || tree.mother?.mother)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/40 dark:from-emerald-950/20 dark:via-gray-800 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-950/40 p-3 md:p-5">
      {/* Self */}
      <div className="flex justify-center mb-2">
        <NodeCard node={tree} label="Bản thân" />
      </div>

      {/* Trunk down from self */}
      <div className="mx-auto h-3 w-px bg-gradient-to-b from-emerald-400 to-transparent dark:from-emerald-700" />

      {/* Horizontal trunk between parents */}
      <div className="relative h-px mx-[12.5%] bg-gradient-to-r from-blue-300 via-emerald-300 to-pink-300 dark:from-blue-800 dark:via-emerald-800 dark:to-pink-800" />

      {/* Vertical drops to parents */}
      <div className="grid grid-cols-2">
        <div className="flex justify-center"><div className="h-3 w-px bg-blue-300 dark:bg-blue-800" /></div>
        <div className="flex justify-center"><div className="h-3 w-px bg-pink-300 dark:bg-pink-800" /></div>
      </div>

      {/* Parents row */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <NodeCard node={tree.father} label="Bố" />
        <NodeCard node={tree.mother} label="Mẹ" />
      </div>

      {/* Grandparents */}
      {hasGrand && (
        <>
          {/* Drops from each parent */}
          <div className="grid grid-cols-2">
            <div className="flex justify-center"><div className="h-3 w-px bg-blue-300 dark:bg-blue-800" /></div>
            <div className="flex justify-center"><div className="h-3 w-px bg-pink-300 dark:bg-pink-800" /></div>
          </div>
          {/* Two horizontal sub-trunks (one under father, one under mother) */}
          <div className="grid grid-cols-2 gap-0">
            <div className="mx-[25%] h-px bg-blue-300 dark:bg-blue-800" />
            <div className="mx-[25%] h-px bg-pink-300 dark:bg-pink-800" />
          </div>
          {/* Verticals down to each grandparent */}
          <div className="grid grid-cols-4">
            <div className="flex justify-center"><div className="h-3 w-px bg-blue-300 dark:bg-blue-800" /></div>
            <div className="flex justify-center"><div className="h-3 w-px bg-blue-300 dark:bg-blue-800" /></div>
            <div className="flex justify-center"><div className="h-3 w-px bg-pink-300 dark:bg-pink-800" /></div>
            <div className="flex justify-center"><div className="h-3 w-px bg-pink-300 dark:bg-pink-800" /></div>
          </div>
          {/* Grandparent cards */}
          <div className="grid grid-cols-4 gap-1.5 md:gap-2">
            <NodeCard node={tree.father?.father ?? null} label="Ông nội" small />
            <NodeCard node={tree.father?.mother ?? null} label="Bà nội" small />
            <NodeCard node={tree.mother?.father ?? null} label="Ông ngoại" small />
            <NodeCard node={tree.mother?.mother ?? null} label="Bà ngoại" small />
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3 text-[10.5px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Trống</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> Mái</span>
      </div>
    </div>
  )
}

function NodeCard({
  node,
  label,
  small,
}: {
  node: Node | null
  label: string
  small?: boolean
}) {
  if (!node) {
    return (
      <div
        className={
          'rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 text-center text-gray-400 dark:text-gray-600 ' +
          (small ? 'p-1.5 md:p-2' : 'p-2.5 md:p-3')
        }
      >
        <div className={'font-semibold uppercase tracking-wider ' + (small ? 'text-[9px]' : 'text-[10px]')}>
          {label}
        </div>
        <div className={'italic mt-1 ' + (small ? 'text-[10px]' : 'text-xs')}>—</div>
      </div>
    )
  }

  const isMale = node.gender === 'trong'
  const isFemale = node.gender === 'mai'
  const tone =
    isMale
      ? {
          bg: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 dark:from-blue-950/40 dark:via-gray-800 dark:to-indigo-950/30',
          ring: 'ring-blue-200 dark:ring-blue-900/60 hover:ring-blue-400 dark:hover:ring-blue-700',
          label: 'text-blue-600 dark:text-blue-400',
          name: 'text-blue-900 dark:text-blue-100',
          icon: '♂',
        }
      : isFemale
        ? {
            bg: 'bg-gradient-to-br from-pink-50 via-white to-rose-50/50 dark:from-pink-950/40 dark:via-gray-800 dark:to-rose-950/30',
            ring: 'ring-pink-200 dark:ring-pink-900/60 hover:ring-pink-400 dark:hover:ring-pink-700',
            label: 'text-pink-600 dark:text-pink-400',
            name: 'text-pink-900 dark:text-pink-100',
            icon: '♀',
          }
        : {
            bg: 'bg-gradient-to-br from-gray-50 via-white to-slate-50/50 dark:from-gray-900/60 dark:via-gray-800 dark:to-slate-900/40',
            ring: 'ring-gray-200 dark:ring-gray-700 hover:ring-gray-400',
            label: 'text-gray-500 dark:text-gray-400',
            name: 'text-gray-900 dark:text-gray-100',
            icon: '?',
          }

  const inner = (
    <div
      className={
        'relative ' + tone.bg + ' ring-1 ' + tone.ring +
        ' rounded-xl shadow-sm hover:shadow-md transition ' +
        (small ? 'p-1.5 md:p-2' : 'p-2 md:p-3')
      }
    >
      <div className="flex items-start justify-between gap-1">
        <div className={'font-bold uppercase tracking-wider ' + tone.label + ' ' + (small ? 'text-[9px]' : 'text-[10px]')}>
          {label}
        </div>
        <span className={'shrink-0 leading-none ' + tone.label + ' ' + (small ? 'text-xs' : 'text-sm')}>
          {tone.icon}
        </span>
      </div>
      <div className={'font-bold truncate mt-0.5 ' + tone.name + ' ' + (small ? 'text-[11px]' : 'text-sm md:text-[15px]')}>
        {node.name ?? node.chicken_code}
      </div>
      {node.breed_name && (
        <div className={'truncate ' + tone.label + ' opacity-90 ' + (small ? 'text-[9.5px]' : 'text-[11px]')}>
          {node.breed_name}
        </div>
      )}
    </div>
  )

  if (node.qr_tag_number) {
    return (
      <Link href={`/ga/${node.qr_tag_number}`} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}
