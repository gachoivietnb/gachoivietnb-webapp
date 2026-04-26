'use client'

import { useEffect, useState } from 'react'

export function BiKipReadingProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement
      const scrollTop = window.scrollY
      const scrollHeight = doc.scrollHeight - doc.clientHeight
      if (scrollHeight <= 0) {
        setPct(0)
        return
      }
      const p = (scrollTop / scrollHeight) * 100
      setPct(Math.max(0, Math.min(100, p)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed top-16 left-0 right-0 z-30 h-1 bg-gray-200/40 dark:bg-gray-800/40 backdrop-blur-sm pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
