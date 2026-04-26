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

function ageMonths(birth: string | null): number | null {
  if (!birth) return null
  return Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30))
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  dang_nuoi: { label: 'Đang nuôi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  dang_cach_ly: { label: 'Cách ly', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  da_ban: { label: 'Đã bán', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  chet: { label: 'Đã mất', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  loai_thai: { label: 'Loại thải', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300' },
}

export function PedigreeTree({ chickenId, initialDepth = 3 }: { chickenId: string; initialDepth?: number }) {
  const [depth, setDepth] = useState(initialDepth)
  const [tree, setTree] = useState<PedigreeNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'tree' | 'list'>('tree')

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

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/40 dark:from-emerald-950/20 dark:via-gray-800 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-950/40 p-12 text-center">
        <div className="text-4xl mb-2 animate-pulse">🌳</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải gia phả...</p>
      </div>
    )
  }
  if (!tree) {
    return (
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-8 text-center">
        <div className="text-4xl mb-2">🌱</div>
        <p className="text-sm text-amber-900 dark:text-amber-200">Không có dữ liệu gia phả</p>
      </div>
    )
  }

  const hasParents = !!(tree.father || tree.mother)

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-xl p-2.5">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          🌳 Số đời
        </span>
        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
          {[2, 3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={
                'px-3 py-1.5 text-xs font-bold rounded-md transition ' +
                (depth === d
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200')
              }
            >
              {d} đời
            </button>
          ))}
        </div>
        <div className="ml-auto flex bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
          <button
            onClick={() => setView('tree')}
            className={
              'px-3 py-1.5 text-xs font-bold rounded-md transition ' +
              (view === 'tree'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-500 hover:text-gray-700')
            }
          >
            🌳 Cây
          </button>
          <button
            onClick={() => setView('list')}
            className={
              'px-3 py-1.5 text-xs font-bold rounded-md transition ' +
              (view === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-500 hover:text-gray-700')
            }
          >
            📋 Thư mục
          </button>
        </div>
      </div>

      {!hasParents ? (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/60 p-6 text-center">
          <div className="text-5xl mb-2">🌱</div>
          <div className="text-base font-bold text-amber-900 dark:text-amber-200 mb-1">
            Chưa cập nhật dữ liệu bố mẹ
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Vào hồ sơ con gà → cập nhật bố / mẹ để thấy cây gia phả ở đây.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/40 dark:from-emerald-950/20 dark:via-gray-800 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-950/40 p-3 md:p-5 overflow-hidden">
          {view === 'tree' ? (
            <div className="overflow-x-auto pb-2">
              <TreeView tree={tree} depth={depth} />
            </div>
          ) : (
            <FolderListView tree={tree} depth={depth} />
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> ♂ Trống
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> ♀ Mái
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>Click thẻ để mở hồ sơ con gà đó</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * 🌳 TREE VIEW — Recursive horizontal tree with connector lines
 * ============================================================ */

function TreeView({ tree, depth }: { tree: PedigreeNode; depth: number }) {
  return (
    <div className="flex justify-center min-w-fit">
      <TreeNode node={tree} remainingDepth={depth} isRoot />
    </div>
  )
}

function TreeNode({
  node,
  remainingDepth,
  isRoot = false,
}: {
  node: PedigreeNode | null
  remainingDepth: number
  isRoot?: boolean
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center mx-1.5">
        <PedigreeCardEmpty />
      </div>
    )
  }

  const hasParents = remainingDepth > 0 && (node.father || node.mother)

  return (
    <div className="flex flex-col items-center mx-1.5">
      {/* Card */}
      <PedigreeCardCompact node={node} isRoot={isRoot} />

      {/* Connector + subtree */}
      {hasParents && (
        <div className="relative pt-3 mt-1">
          {/* vertical line down from card */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-3 bg-gradient-to-b from-emerald-400 to-emerald-300 dark:from-emerald-700 dark:to-emerald-800" />
          <div className="flex items-start gap-1 relative">
            {/* horizontal trunk over the children */}
            <span className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-blue-300 via-emerald-300 to-pink-300 dark:from-blue-800 dark:via-emerald-800 dark:to-pink-800" />
            {/* vertical drops */}
            <div className="flex flex-col items-center pt-3 relative">
              <span className="absolute top-0 w-px h-3 bg-blue-300 dark:bg-blue-800" />
              <TreeNode node={node.father} remainingDepth={remainingDepth - 1} />
            </div>
            <div className="flex flex-col items-center pt-3 relative">
              <span className="absolute top-0 w-px h-3 bg-pink-300 dark:bg-pink-800" />
              <TreeNode node={node.mother} remainingDepth={remainingDepth - 1} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * 📋 FOLDER LIST VIEW — vertical tree (cây thư mục)
 * ============================================================ */

function FolderListView({ tree, depth }: { tree: PedigreeNode; depth: number }) {
  return (
    <div className="font-mono text-sm">
      <FolderRow node={tree} prefix="" isLast remainingDepth={depth} side="self" />
    </div>
  )
}

function FolderRow({
  node, prefix, isLast, remainingDepth, side,
}: {
  node: PedigreeNode | null
  prefix: string
  isLast: boolean
  remainingDepth: number
  side: 'self' | 'father' | 'mother'
}) {
  const branch = isLast ? '└─ ' : '├─ '
  const childPrefix = prefix + (isLast ? '   ' : '│  ')

  return (
    <>
      <div className="flex items-center gap-1.5 py-1.5 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 rounded transition">
        <span className="text-gray-400 dark:text-gray-600 select-none whitespace-pre">
          {prefix}
          {prefix !== '' && branch}
        </span>
        {node ? (
          <FolderCard node={node} side={side} />
        ) : (
          <span className="text-xs text-gray-400 italic">— Chưa cập nhật —</span>
        )}
      </div>
      {node && remainingDepth > 0 && (node.father || node.mother) && (
        <>
          <FolderRow
            node={node.father}
            prefix={childPrefix}
            isLast={false}
            remainingDepth={remainingDepth - 1}
            side="father"
          />
          <FolderRow
            node={node.mother}
            prefix={childPrefix}
            isLast={true}
            remainingDepth={remainingDepth - 1}
            side="mother"
          />
        </>
      )}
    </>
  )
}

function FolderCard({ node, side }: { node: PedigreeNode; side: 'self' | 'father' | 'mother' }) {
  const tone = node.gender === 'trong'
    ? 'text-blue-700 dark:text-blue-300'
    : node.gender === 'mai'
      ? 'text-pink-700 dark:text-pink-300'
      : 'text-gray-700 dark:text-gray-300'
  const icon = node.gender === 'trong' ? '♂' : node.gender === 'mai' ? '♀' : '?'
  const label = POSITION_LABELS[node.position] ?? side
  const age = ageMonths(node.birth_date)
  return (
    <Link
      href={`/admin/ho-so-ga/${node.chicken_id}`}
      className="inline-flex items-center gap-1.5 text-xs hover:underline"
    >
      <span className={'font-bold ' + tone}>{icon}</span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {label}:
      </span>
      <span className="font-bold text-gray-900 dark:text-gray-100">{node.name ?? node.chicken_code}</span>
      {node.breed_name && <span className="text-gray-500 dark:text-gray-400">· {node.breed_name}</span>}
      {age != null && <span className="text-gray-400 dark:text-gray-500">· {age}t</span>}
      {node.qr_tag_number && (
        <span className="text-blue-600 dark:text-blue-400 font-mono">#{node.qr_tag_number}</span>
      )}
    </Link>
  )
}

/* ============================================================
 * Cards
 * ============================================================ */

function PedigreeCardCompact({ node, isRoot }: { node: PedigreeNode; isRoot?: boolean }) {
  const isMale = node.gender === 'trong'
  const isFemale = node.gender === 'mai'
  const tone = isMale
    ? {
        bg: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 dark:from-blue-950/40 dark:via-gray-800 dark:to-indigo-950/30',
        ring: 'ring-blue-300 dark:ring-blue-800',
        ringHover: 'hover:ring-blue-500 dark:hover:ring-blue-600',
        accent: 'from-blue-500 to-indigo-500',
        label: 'text-blue-700 dark:text-blue-300',
        name: 'text-blue-900 dark:text-blue-100',
        icon: '♂',
        bagde: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      }
    : isFemale
      ? {
          bg: 'bg-gradient-to-br from-pink-50 via-white to-rose-50/50 dark:from-pink-950/40 dark:via-gray-800 dark:to-rose-950/30',
          ring: 'ring-pink-300 dark:ring-pink-800',
          ringHover: 'hover:ring-pink-500 dark:hover:ring-pink-600',
          accent: 'from-pink-500 to-rose-500',
          label: 'text-pink-700 dark:text-pink-300',
          name: 'text-pink-900 dark:text-pink-100',
          icon: '♀',
          bagde: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
        }
      : {
          bg: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/60 dark:to-slate-900/40',
          ring: 'ring-gray-300 dark:ring-gray-700',
          ringHover: 'hover:ring-gray-400',
          accent: 'from-gray-400 to-gray-500',
          label: 'text-gray-500',
          name: 'text-gray-900 dark:text-gray-100',
          icon: '?',
          bagde: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
        }

  const label = POSITION_LABELS[node.position] ?? node.position
  const age = ageMonths(node.birth_date)
  const status = STATUS_META[node.status]
  const W = isRoot ? 'w-44 md:w-52' : 'w-36 md:w-40'

  return (
    <Link
      href={`/admin/ho-so-ga/${node.chicken_id}`}
      className={`block ${W} ${tone.bg} rounded-xl shadow-sm hover:shadow-lg transition relative overflow-hidden ring-2 ${tone.ring} ${tone.ringHover} ${isRoot ? 'shadow-md' : ''}`}
    >
      {/* Top accent strip */}
      <div className={`h-1 bg-gradient-to-r ${tone.accent}`} />
      <div className="p-2.5">
        {/* Position label + gender icon */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-widest ${tone.label} ${isRoot ? 'bg-white/60 dark:bg-gray-900/40 rounded-full px-1.5 py-0.5' : ''}`}>
            {isRoot ? '⭐ ' : ''}{label}
          </span>
          <span className={`leading-none ${tone.label} ${isRoot ? 'text-base' : 'text-sm'}`}>
            {tone.icon}
          </span>
        </div>

        {/* Photo + info */}
        <div className="flex gap-2 items-start">
          {node.main_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.main_photo_url}
              alt={node.chicken_code}
              className={`${isRoot ? 'w-12 h-12' : 'w-10 h-10'} rounded-lg object-cover flex-shrink-0 ring-1 ring-white/50`}
            />
          ) : (
            <div className={`${isRoot ? 'w-12 h-12' : 'w-10 h-10'} rounded-lg bg-white/40 dark:bg-gray-900/40 flex items-center justify-center text-lg flex-shrink-0`}>
              🐓
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className={`font-bold truncate leading-tight ${tone.name} ${isRoot ? 'text-sm' : 'text-[12px]'}`}>
              {node.name ?? node.chicken_code}
            </div>
            {node.breed_name && (
              <div className={`text-[10px] truncate ${tone.label} opacity-90`}>
                {node.breed_name}
              </div>
            )}
            {(age != null || node.qr_tag_number) && (
              <div className="flex items-center gap-1 mt-0.5 text-[9.5px] text-gray-500 dark:text-gray-400">
                {age != null && <span>{age}t</span>}
                {age != null && node.qr_tag_number && <span>·</span>}
                {node.qr_tag_number && (
                  <span className="font-mono text-blue-600 dark:text-blue-400">#{node.qr_tag_number}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status pill (only on root or notable status) */}
        {(isRoot || (status && status.label !== 'Đang nuôi')) && status && (
          <div className="mt-2">
            <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${status.cls}`}>
              {status.label}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

function PedigreeCardEmpty() {
  return (
    <div className="w-36 md:w-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/20 p-2.5 text-center">
      <div className="h-1 rounded-full bg-gray-200/60 dark:bg-gray-800 mb-1.5" />
      <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Chưa rõ</div>
      <div className="w-10 h-10 mx-auto rounded-lg bg-white/40 dark:bg-gray-900/40 flex items-center justify-center text-lg opacity-50">
        ?
      </div>
      <div className="text-[10px] italic text-gray-400 mt-1">Chưa cập nhật</div>
    </div>
  )
}
