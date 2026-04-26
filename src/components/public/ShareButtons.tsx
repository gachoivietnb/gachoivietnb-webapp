'use client'

export function ShareButtons({ url, title }: { url: string; title: string }) {
  async function handleShare() {
    if ('share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: { title: string; url: string }) => Promise<void> }).share({
          title,
          url,
        })
        return
      } catch {
        // ignore
      }
    }
    await navigator.clipboard.writeText(url)
    alert('Đã copy link!')
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={handleShare} className="flex-1 min-w-[120px] bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-600">
        📤 Chia sẻ
      </button>
      <a
        href={`https://zalo.me/share?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
      >
        Zalo
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800"
      >
        Facebook
      </a>
    </div>
  )
}
