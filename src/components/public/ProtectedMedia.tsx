'use client'

type Props = {
  src: string
  alt?: string
  type: 'image' | 'video'
  brand: string
  url: string
  phone?: string
  className?: string
  videoControls?: boolean
  watermarkSize?: 'sm' | 'md' | 'lg'
}

/**
 * Wrapper chống tải / chống copy:
 * - Disable right-click, drag, selection
 * - Video: controlsList="nodownload noplaybackrate" + disablePictureInPicture
 * - Overlay watermark "Gà Chọi Việt NB – gachoivietnb.com" ở góc + diagonal ở giữa
 * Note: đây là lớp chống-lãng-gạc ở client-side. Ảnh upload đã có watermark bake-in
 * từ server nên dù user chụp màn hình vẫn có brand.
 */
export function ProtectedMedia({
  src,
  alt,
  type,
  brand,
  url,
  phone,
  className = '',
  videoControls = true,
  watermarkSize = 'md',
}: Props) {
  const preventContext = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    return false
  }

  const sizeClass =
    watermarkSize === 'sm' ? 'text-[9px]' : watermarkSize === 'lg' ? 'text-sm' : 'text-[11px]'

  return (
    <div
      className={`relative select-none overflow-hidden ${className}`}
      onContextMenu={preventContext}
      onDragStart={preventContext}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {type === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ''}
          draggable={false}
          onContextMenu={preventContext}
          onDragStart={preventContext}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <video
          src={src}
          controls={videoControls}
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          onContextMenu={preventContext}
          onDragStart={preventContext}
          className="w-full h-full object-cover"
          playsInline
        />
      )}

      {/* Diagonal watermark giữa khung — nổi khi chụp màn hình */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`text-white/25 font-bold tracking-wider rotate-[-28deg] drop-shadow-md whitespace-nowrap text-center ${
            watermarkSize === 'lg' ? 'text-2xl' : watermarkSize === 'sm' ? 'text-xs' : 'text-base'
          }`}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
        >
          {brand}
          {phone && <div className="opacity-90 text-[0.75em] mt-0.5">☎ {phone}</div>}
        </div>
      </div>

      {/* Watermark góc dưới phải */}
      <div
        className={`absolute bottom-1.5 right-2 pointer-events-none ${sizeClass} text-white font-semibold leading-tight text-right`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)' }}
      >
        <div>{brand}</div>
        <div className="opacity-90 font-normal">{url.replace(/^https?:\/\//, '')}</div>
        {phone && <div className="opacity-90 font-normal">☎ {phone}</div>}
      </div>
    </div>
  )
}
