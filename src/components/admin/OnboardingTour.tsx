'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    title: 'Chào mừng đến Gà Chọi Việt NB! 🐓',
    content:
      'Hệ thống quản lý trang trại gà chọi đầy đủ. Tour này giới thiệu các chức năng chính trong 2 phút.',
    cta: 'Bắt đầu',
  },
  {
    title: 'Bước 1: Cấu hình thông tin trang trại',
    content:
      'Vào Cài đặt → Thông tin trang trại để nhập tên, địa chỉ, Zalo, hotline. Thông tin này hiển thị trên website công khai.',
    cta: 'Tiếp theo',
  },
  {
    title: 'Bước 2: Quản lý đàn gà',
    content:
      'Trang "Hồ sơ gà" để thêm/sửa/xem từng con. Có thể nhập hàng loạt hoặc import Excel. Mỗi con có QR riêng.',
    cta: 'Tiếp theo',
  },
  {
    title: 'Bước 3: Quét QR thẻ chân gà',
    content:
      'Trang "Quét QR" mở camera điện thoại. Quét thẻ → đến hồ sơ con đó. In thẻ tại "QR Tags".',
    cta: 'Tiếp theo',
  },
  {
    title: 'Bước 4: Dashboard + Báo cáo',
    content:
      'Dashboard hiện số liệu thời gian thực. Tài chính → Báo cáo có 8 báo cáo, tất cả xuất Excel. Cần trợ giúp? Click chatbot 💬 góc phải.',
    cta: 'Hoàn thành',
  },
]

export function OnboardingTour({
  profile,
}: {
  profile: { id: string; onboarding_completed: boolean }
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile.onboarding_completed) {
      const dismissed = sessionStorage.getItem('onboarding-dismissed')
      if (!dismissed) setOpen(true)
    }
  }, [profile.onboarding_completed])

  async function complete() {
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as never)
        .eq('id', profile.id)
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  async function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      await complete()
    }
  }

  function skip() {
    sessionStorage.setItem('onboarding-dismissed', '1')
    setOpen(false)
  }

  if (!open) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-6 h-1 rounded transition-colors ${
                  i <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={skip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            Bỏ qua
          </button>
        </div>

        <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
          {current.title}
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm leading-relaxed">
          {current.content}
        </p>

        <button
          onClick={next}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-2 rounded font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : current.cta}
        </button>
      </div>
    </div>
  )
}
