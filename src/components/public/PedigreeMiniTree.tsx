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
      .then((j) => { setTree(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [chickenId])

  if (loading) return <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">Đang tải gia phả...</div>
  if (!tree) return <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">Không có dữ liệu gia phả</div>

  const hasParents = tree.father || tree.mother

  if (!hasParents) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm italic">
        Chưa cập nhật dữ liệu bố mẹ
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <NodeCard node={tree} label="Bản thân" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NodeCard node={tree.father} label="Bố" />
        <NodeCard node={tree.mother} label="Mẹ" />
      </div>
      {(tree.father?.father || tree.father?.mother || tree.mother?.father || tree.mother?.mother) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
            Xem thêm đời ông bà
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <NodeCard node={tree.father?.father ?? null} label="Ông nội" small />
            <NodeCard node={tree.father?.mother ?? null} label="Bà nội" small />
            <NodeCard node={tree.mother?.father ?? null} label="Ông ngoại" small />
            <NodeCard node={tree.mother?.mother ?? null} label="Bà ngoại" small />
          </div>
        </details>
      )}
    </div>
  )
}

function NodeCard({ node, label, small }: { node: Node | null; label: string; small?: boolean }) {
  if (!node) {
    return (
      <div className={`border border-dashed border-gray-200 rounded text-center text-gray-400 ${small ? 'p-2 text-xs' : 'p-3 text-sm'}`}>
        <div className="opacity-50">{label}</div>
        <div className="italic">—</div>
      </div>
    )
  }

  const content = (
    <div className={`bg-white border border-gray-200 rounded hover:border-blue-300 transition ${small ? 'p-2' : 'p-3'}`}>
      <div className={`text-gray-500 uppercase ${small ? 'text-[10px]' : 'text-xs'}`}>{label}</div>
      <div className={`font-medium truncate ${small ? 'text-xs' : 'text-sm'}`}>{node.name ?? node.chicken_code}</div>
      <div className={`text-gray-500 truncate ${small ? 'text-[10px]' : 'text-xs'}`}>
        {node.breed_name} · {node.gender === 'trong' ? '♂' : node.gender === 'mai' ? '♀' : '?'}
      </div>
    </div>
  )

  if (node.qr_tag_number) {
    return <Link href={`/ga/${node.qr_tag_number}`} className="block">{content}</Link>
  }
  return content
}
