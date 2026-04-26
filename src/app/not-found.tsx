import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🐓</div>
        <h1 className="text-2xl font-medium mb-2">404 — Không tìm thấy trang</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Trang bạn tìm không tồn tại hoặc đã bị xóa.</p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
