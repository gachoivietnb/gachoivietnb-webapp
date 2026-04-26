'use client'

import { useEffect, useState } from 'react'

/**
 * Fixed button that fades in once the user has scrolled more than
 * ~400px. Click → smooth scroll to top.
 *
 * Positioned bottom-LEFT (not bottom-right) so it never collides with
 * existing right-side widgets — Chatbot floating button (admin),
 * sticky price+Zalo CTA (/ga/[tag]), Vercel Live preview, etc.
 */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Về đầu trang"
      title="Về đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={
        'fixed left-4 z-40 md:left-6 ' +
        'bottom-20 md:bottom-6 ' +
        'w-11 h-11 md:w-12 md:h-12 rounded-full ' +
        'bg-gradient-to-br from-orange-500 to-red-500 ' +
        'text-white text-xl font-bold shadow-lg hover:shadow-xl ' +
        'flex items-center justify-center ' +
        'transition-all duration-300 ' +
        'hover:scale-110 active:scale-95 ' +
        (visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none')
      }
    >
      ↑
    </button>
  )
}
