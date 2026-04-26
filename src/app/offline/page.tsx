export const metadata = { title: 'Mất kết nối' }

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📵</div>
        <h1 className="text-2xl font-medium mb-2">Mất kết nối mạng</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Hệ thống đang hoạt động ở chế độ offline. Một số trang đã được cache — bạn có thể xem nhưng thao tác ghi dữ liệu sẽ được đồng bộ khi có mạng lại.
        </p>
        <a href="/admin" className="inline-block bg-blue-600 text-white px-6 py-2 rounded font-medium">
          Thử lại
        </a>
      </div>
    </div>
  )
}
