'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Multi-layer copy protection for Bí Kíp Sư Kê article body.
 *
 * Layers (cumulative — each adds friction, none is 100%):
 * 1. CSS `user-select: none` + `-webkit-touch-callout: none` (mobile long-press)
 * 2. Block events: copy, cut, contextmenu, selectstart, dragstart
 * 3. Block keyboard shortcuts: Ctrl/⌘ + C/X/A/P/S
 * 4. Friendly toast on attempt with "Copy link instead" CTA
 * 5. Print stylesheet replaces content with branded notice
 * 6. Diagonal watermark overlay (visible on screenshots/screen recordings)
 *
 * SEO unaffected — Googlebot doesn't run user gestures, and content remains
 * in the DOM for crawler indexing.
 */
export function BiKipCopyGuard({
  children,
  watermark = 'gachoivietnb.com',
}: {
  children: React.ReactNode
  watermark?: string
}) {
  const [toast, setToast] = useState<{ id: number; copied: boolean } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flash(copied = false) {
    setToast({ id: Date.now(), copied })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    function blockHandler(e: Event) {
      const target = e.target as HTMLElement | null
      // Allow user actions on interactive controls (a, button, input, etc.) outside the guard
      if (
        target &&
        target.closest &&
        (target.closest('a[href^="tel:"]') ||
          target.closest('a[href^="mailto:"]') ||
          target.closest('button') ||
          target.closest('input') ||
          target.closest('textarea'))
      ) {
        return
      }
      e.preventDefault()
      flash(false)
    }

    function keyHandler(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (['c', 'x', 'a', 'p', 's', 'u'].includes(k)) {
        e.preventDefault()
        flash(false)
      }
    }

    const el = document
    const events: Array<keyof DocumentEventMap> = [
      'copy',
      'cut',
      'contextmenu',
      'selectstart',
      'dragstart',
    ]
    events.forEach((ev) =>
      el.addEventListener(ev, blockHandler as EventListener, { capture: true })
    )
    el.addEventListener('keydown', keyHandler, { capture: true })

    return () => {
      events.forEach((ev) =>
        el.removeEventListener(ev, blockHandler as EventListener, { capture: true })
      )
      el.removeEventListener('keydown', keyHandler, { capture: true })
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      flash(true)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* HTML comment for source-view */}
      {/* eslint-disable-next-line react/no-danger */}
      <div
        dangerouslySetInnerHTML={{
          __html: `<!--
  © ${new Date().getFullYear()} Gà Chọi Việt Ninh Bình — gachoivietnb.com
  Nội dung Bí Kíp Sư Kê được bảo vệ bản quyền.
  Vui lòng không sao chép, in lại, hoặc tái sản xuất dưới mọi hình thức
  mà không có sự đồng ý bằng văn bản của trang trại.
  Hotline: 0933.669.639 — Liên hệ để cấp phép sử dụng nội dung.
-->`,
        }}
      />

      <style>{`
        .bikip-protect {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        .bikip-protect img,
        .bikip-protect figure {
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
        /* Re-enable interaction on links/buttons inside the protected area */
        .bikip-protect a,
        .bikip-protect button {
          pointer-events: auto;
          -webkit-user-select: none;
        }
        .bikip-watermark {
          position: relative;
        }
        .bikip-watermark::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background-image: repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 80px,
            rgba(234, 88, 12, 0.04) 80px,
            rgba(234, 88, 12, 0.04) 200px
          );
          background-size: 280px 280px;
        }
        .bikip-watermark::after {
          content: '${watermark.replace(/'/g, "\\'")}    ${watermark.replace(/'/g, "\\'")}    ${watermark.replace(/'/g, "\\'")}    ${watermark.replace(/'/g, "\\'")}    ${watermark.replace(/'/g, "\\'")}';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          color: rgba(234, 88, 12, 0.06);
          font-size: 28px;
          font-weight: 800;
          font-family: ui-sans-serif, system-ui;
          transform: rotate(-32deg);
          transform-origin: center;
          letter-spacing: 4px;
          line-height: 200px;
          text-align: center;
          white-space: pre-wrap;
          overflow: hidden;
        }
        .bikip-watermark > * {
          position: relative;
          z-index: 2;
        }
        @media print {
          .bikip-protect {
            display: none !important;
          }
          body::before {
            content: '📚 Bí Kíp Sư Kê — © Gà Chọi Việt Ninh Bình — gachoivietnb.com\\AVui lòng đọc trực tuyến thay vì in. Hotline 0933.669.639.';
            white-space: pre;
            display: block;
            text-align: center;
            font-size: 18px;
            padding: 80px 20px;
            font-family: ui-sans-serif, system-ui;
          }
        }
      `}</style>

      <div className="bikip-protect bikip-watermark">{children}</div>

      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-orange-400/30 px-4 py-3 flex items-center gap-3 max-w-md">
            <span className="text-2xl">🔒</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                {toast.copied ? '✓ Đã copy link bài viết' : 'Nội dung được bảo vệ'}
              </div>
              <div className="text-[11px] text-gray-300 leading-snug">
                {toast.copied
                  ? 'Cảm ơn bạn đã đọc Bí Kíp! Hãy chia sẻ link cho bạn bè.'
                  : 'Vui lòng share link bài viết — đừng copy nội dung.'}
              </div>
            </div>
            {!toast.copied && (
              <button
                onClick={copyLink}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 hover:shadow-lg transition whitespace-nowrap"
              >
                🔗 Copy link
              </button>
            )}
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-white text-base leading-none px-1"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
