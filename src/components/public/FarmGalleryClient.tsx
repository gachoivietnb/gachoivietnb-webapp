'use client'

import { useState } from 'react'
import { ProtectedMedia } from './ProtectedMedia'

type Item = {
  id: string
  media_type: string
  url: string
  title: string | null
  description: string | null
  category: string
}

export function FarmGalleryClient({
  items,
  brand,
  brandUrl,
  brandPhone,
}: {
  items: Item[]
  brand: string
  brandUrl: string
  brandPhone: string
}) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const current = lightbox != null ? items[lightbox] : null

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setLightbox(i)}
            className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
          >
            <ProtectedMedia
              src={item.url}
              alt={item.title ?? ''}
              type={item.media_type === 'video' ? 'video' : 'image'}
              brand={brand}
              url={brandUrl}
              phone={brandPhone}
              className="w-full h-full"
              videoControls={false}
              watermarkSize="sm"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
              {item.title && (
                <div className="text-white text-sm font-semibold drop-shadow line-clamp-2">
                  {item.title}
                </div>
              )}
              <div className="text-white/80 text-[11px] mt-0.5">
                {item.media_type === 'video' ? '▶ Bấm xem video' : '🔍 Bấm xem lớn'}
              </div>
            </div>
            {item.media_type === 'video' && (
              <div className="absolute top-2 left-2 bg-black/60 text-white rounded-full px-2 py-0.5 text-[10px] font-medium">
                🎥 Video
              </div>
            )}
          </button>
        ))}
      </div>

      {/* LIGHTBOX */}
      {current && lightbox != null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Prev button */}
          {lightbox > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(lightbox - 1)
              }}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition"
              aria-label="Ảnh trước"
            >
              ‹
            </button>
          )}
          {lightbox < items.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(lightbox + 1)
              }}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition"
              aria-label="Ảnh sau"
            >
              ›
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl transition"
            aria-label="Đóng"
          >
            ✕
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 bg-white/10 text-white rounded-full px-3 py-1 text-sm">
            {lightbox + 1} / {items.length}
          </div>

          {/* Media */}
          <div
            className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1 flex items-center justify-center w-full">
              <ProtectedMedia
                src={current.url}
                alt={current.title ?? ''}
                type={current.media_type === 'video' ? 'video' : 'image'}
                brand={brand}
                url={brandUrl}
                phone={brandPhone}
                className="max-w-full max-h-[80vh]"
                videoControls={true}
                watermarkSize="md"
              />
            </div>
            {(current.title || current.description) && (
              <div className="mt-3 text-center text-white max-w-3xl">
                {current.title && <div className="font-semibold text-lg">{current.title}</div>}
                {current.description && (
                  <p className="text-sm text-gray-300 mt-1">{current.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
