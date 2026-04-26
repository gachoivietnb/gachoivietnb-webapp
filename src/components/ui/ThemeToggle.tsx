'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="w-9 h-9" aria-hidden />
  }

  const current = theme === 'system' ? resolvedTheme : theme
  const next = current === 'dark' ? 'light' : 'dark'

  return (
    <button
      onClick={() => setTheme(next)}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition text-lg"
      title={`Chuyển sang ${next === 'dark' ? 'tối' : 'sáng'}`}
      aria-label="Đổi giao diện"
    >
      {current === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
