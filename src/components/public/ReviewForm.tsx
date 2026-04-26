'use client'

import { useState } from 'react'

export function ReviewForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (rating === 0) return setErr('Chọn số sao')
    setLoading(true)
    setErr(null)
    const res = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, rating, comment: comment || undefined }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi')
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="font-medium text-green-900">Cảm ơn bạn!</h3>
        <p className="text-sm text-green-700 dark:text-green-300 mt-2">Đánh giá đã được gửi.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div>
        <p className="text-sm font-medium mb-2">Bạn chấm mấy sao?</p>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`text-4xl transition-transform ${n <= rating ? 'scale-110' : 'opacity-30 hover:opacity-60'}`}
            >
              ⭐
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            {rating === 5 ? 'Tuyệt vời!'
              : rating === 4 ? 'Hài lòng'
              : rating === 3 ? 'Tạm ổn'
              : rating === 2 ? 'Chưa hài lòng'
              : 'Kém'}
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-sm block mb-1">Nhận xét (tuỳ chọn)</span>
        <textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Gà chọi có tốt không? Giao hàng có đúng hẹn? Có điểm nào cần cải thiện?"
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
        />
      </label>

      {err && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{err}</div>
      )}

      <button
        onClick={submit}
        disabled={loading || rating === 0}
        className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
      </button>
    </div>
  )
}
